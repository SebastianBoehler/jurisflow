from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable

from google.adk.agents import BaseAgent, LoopAgent, ParallelAgent, SequentialAgent
from sqlalchemy import select

from jurisflow_agents.llm import OpenRouterClient, OpenRouterError
from jurisflow_agents.research_llm_types import ResearchMemo
from jurisflow_agents.research_observability import (
    create_artifact_service,
    format_reasoning_digest,
    seed_trace,
    update_stage,
    upsert_artifact,
)
from jurisflow_agents.research_pipeline import build_research_pipeline
from jurisflow_agents.research_prompts import (
    gap_system_prompt,
    gap_user_prompt,
    planner_system_prompt,
    planner_user_prompt,
    synthesis_system_prompt,
    synthesis_user_prompt,
)
from jurisflow_agents.research_support import SOURCE_LABELS, fallback_gap_analysis, fallback_plan, score_internal_chunk, tasks_to_queries, tokenize
from jurisflow_agents.research_types import ResearchWorkflowInput, ResearchWorkflowState
from jurisflow_db.models import Document, DocumentChunk
from jurisflow_db.session import get_session_factory
from jurisflow_retrieval import merge_results
from jurisflow_retrieval.providers.case_law import CaseLawProvider
from jurisflow_retrieval.providers.eurlex import EurLexProvider
from jurisflow_retrieval.providers.federal import FederalLawProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import ResearchSource

AgentHandler = Callable[[ResearchWorkflowState], list[RetrievalHit] | None]
StateUpdateHandler = Callable[[ResearchWorkflowState], None]


def run_research_workflow(
    workflow_input: ResearchWorkflowInput,
    *,
    on_update: StateUpdateHandler | None = None,
) -> ResearchWorkflowState:
    llm = OpenRouterClient()
    artifact_service = create_artifact_service()
    state = ResearchWorkflowState(payload=workflow_input, used_live_llm=llm.is_configured)
    seed_trace(state)
    state.summary = "Deep Research wird vorbereitet."
    _notify(on_update, state)
    handlers: dict[str, AgentHandler] = {
        "QueryPlannerAgent": lambda current_state: _run_query_planner(current_state, llm, artifact_service),
        "FederalLawSearchAgent": lambda current_state: _run_source_search(current_state, ResearchSource.FEDERAL_LAW),
        "CaseLawSearchAgent": lambda current_state: _run_source_search(current_state, ResearchSource.CASE_LAW),
        "EuLawSearchAgent": lambda current_state: _run_source_search(current_state, ResearchSource.EU_LAW),
        "InternalDocsSearchAgent": _run_internal_docs_search,
        "GapAnalysisAgent": lambda current_state: _run_gap_analysis(current_state, llm, artifact_service),
        "Reranker": _run_reranker,
        "SynthesisAgent": lambda current_state: _run_synthesis(current_state, llm, artifact_service),
    }
    _execute_agent(build_research_pipeline(), state, handlers, on_update)
    return state


def _execute_agent(
    agent: BaseAgent,
    state: ResearchWorkflowState,
    handlers: dict[str, AgentHandler],
    on_update: StateUpdateHandler | None,
) -> list[RetrievalHit] | None:
    if isinstance(agent, SequentialAgent):
        result = None
        for sub_agent in agent.sub_agents:
            result = _execute_agent(sub_agent, state, handlers, on_update)
            _notify(on_update, state)
        return result

    if isinstance(agent, LoopAgent):
        result = None
        for iteration in range(agent.max_iterations or 1):
            state.iteration = iteration
            if iteration > 0 and not any(state.pending_queries.values()):
                break
            for sub_agent in agent.sub_agents:
                result = _execute_agent(sub_agent, state, handlers, on_update)
                _notify(on_update, state)
        return result

    if isinstance(agent, ParallelAgent):
        with ThreadPoolExecutor(max_workers=len(agent.sub_agents) or 1) as executor:
            futures = [executor.submit(_execute_agent, sub_agent, state, handlers, None) for sub_agent in agent.sub_agents]
            for future in as_completed(futures):
                future.result()
                _notify(on_update, state)
        return None

    handler = handlers.get(agent.name)
    return handler(state) if handler else None


def _run_query_planner(state: ResearchWorkflowState, llm: OpenRouterClient, artifact_service) -> None:
    state.normalized_query = " ".join(state.payload.request.query.split())
    plan = fallback_plan(state)
    if llm.is_configured:
        try:
            plan = llm.generate_json(
                system_prompt=planner_system_prompt(),
                user_prompt=planner_user_prompt(
                    state.payload.request.query,
                    state.payload.request.focus,
                    state.enabled_sources,
                    state.payload.request.max_results,
                ),
                response_model=type(plan),
            )
        except OpenRouterError as exc:
            state.summary = f"OpenRouter nicht verfuegbar, Fallback-Modus aktiv: {str(exc)[:180]}"
            state.used_live_llm = False
    with state.lock:
        state.plan = plan
        state.pending_queries = tasks_to_queries(plan.tasks, state.enabled_sources)
        state.summary = "Rechercheplan erstellt."
    update_stage(
        state,
        key="planner",
        label="Rechercheplan erstellen",
        agent="QueryPlannerAgent",
        status="complete",
        detail=f"{len(plan.tasks)} Suchaufgaben ueber {len(state.enabled_sources)} Quellen geplant.",
        metadata={"strategy": plan.search_strategy},
    )
    upsert_artifact(
        state,
        artifact_service,
        key="research-plan",
        title="Rechercheplan",
        kind="plan",
        content=_format_plan_artifact(plan),
        metadata={"task_count": len(plan.tasks)},
    )
    return None


def _run_source_search(state: ResearchWorkflowState, source: ResearchSource) -> list[RetrievalHit]:
    queries = _consume_queries(state, source)
    if source not in state.enabled_sources or not queries:
        update_stage(
            state,
            key=f"search:{source.value}",
            label=f"{SOURCE_LABELS[source]} durchsuchen",
            agent=_search_agent_name(source),
            status="skipped",
            source=source,
            detail="Keine Suchanfragen fuer diese Quelle vorhanden.",
        )
        return []
    provider = {
        ResearchSource.FEDERAL_LAW: FederalLawProvider(),
        ResearchSource.CASE_LAW: CaseLawProvider(),
        ResearchSource.EU_LAW: EurLexProvider(),
    }[source]
    hits: list[RetrievalHit] = []
    errors: list[str] = []
    max_results = max(2, state.payload.request.max_results // max(1, len(queries)))
    for query in queries:
        try:
            hits.extend(
                provider.search(
                    SearchRequest(query=query, focus=None, max_results=max_results, filters=state.payload.request.filters)
                )
            )
        except Exception as exc:
            errors.append(str(exc))
    with state.lock:
        state.source_results[source] = merge_results(state.source_results.get(source, []), hits, limit=state.payload.request.max_results)
        if errors:
            state.source_errors[source] = errors[0][:240]
    update_stage(
        state,
        key=f"search:{source.value}",
        label=f"{SOURCE_LABELS[source]} durchsuchen",
        agent=_search_agent_name(source),
        status="failed" if errors else "complete",
        detail=errors[0][:160] if errors else f"{len(hits)} Treffer aus {len(queries)} Suchanfragen zusammengefuehrt.",
        source=source,
        metadata={"queries": queries, "result_count": len(hits)},
    )
    return hits


def _run_internal_docs_search(state: ResearchWorkflowState) -> list[RetrievalHit]:
    source = ResearchSource.INTERNAL_DOCS
    queries = _consume_queries(state, source)
    if source not in state.enabled_sources or not queries:
        update_stage(
            state,
            key=f"search:{source.value}",
            label=f"{SOURCE_LABELS[source]} durchsuchen",
            agent="InternalDocsSearchAgent",
            status="skipped",
            source=source,
            detail="Keine internen Suchanfragen vorhanden.",
        )
        return []
    hits: list[RetrievalHit] = []
    session = get_session_factory()()
    try:
        stmt = (
            select(DocumentChunk, Document.title)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(
                DocumentChunk.tenant_id == state.payload.tenant_id,
                Document.tenant_id == state.payload.tenant_id,
                Document.matter_id == state.payload.matter_id,
            )
        )
        rows = list(session.execute(stmt))
        for query in queries:
            query_tokens = tokenize(query)
            for chunk, title in rows:
                score = score_internal_chunk(chunk.content, chunk.keywords or "", query_tokens)
                if score <= 0:
                    continue
                hits.append(
                    RetrievalHit(source=source, title=title, excerpt=chunk.content[:450], relevance_score=score)
                )
    finally:
        session.close()
    with state.lock:
        state.source_results[source] = merge_results(state.source_results.get(source, []), hits, limit=state.payload.request.max_results)
        if not hits:
            state.source_errors[source] = "Keine relevanten internen Dokumentstellen gefunden."
    update_stage(
        state,
        key=f"search:{source.value}",
        label=f"{SOURCE_LABELS[source]} durchsuchen",
        agent="InternalDocsSearchAgent",
        status="complete" if hits else "failed",
        detail=f"{len(hits)} interne Fundstellen identifiziert." if hits else "Keine relevanten internen Dokumentstellen gefunden.",
        source=source,
        metadata={"queries": queries, "result_count": len(hits)},
    )
    return hits


def _run_gap_analysis(state: ResearchWorkflowState, llm: OpenRouterClient, artifact_service) -> None:
    if not state.payload.request.deep_research:
        update_stage(state, key="gap", label="Rechercheluecken pruefen", agent="GapAnalysisAgent", status="skipped", detail="Deep Research ist deaktiviert.")
        with state.lock:
            state.pending_queries = {}
        return None
    if state.iteration > 0:
        update_stage(state, key="gap", label="Rechercheluecken pruefen", agent="GapAnalysisAgent", status="complete", detail="Folgerunde abgeschlossen.")
        with state.lock:
            state.pending_queries = {}
        return None
    _run_reranker(state)
    analysis = fallback_gap_analysis(state)
    if llm.is_configured and state.merged_results:
        try:
            analysis = llm.generate_json(
                system_prompt=gap_system_prompt(),
                user_prompt=gap_user_prompt(state),
                response_model=type(analysis),
            )
        except OpenRouterError:
            state.used_live_llm = False
    with state.lock:
        state.gap_analysis = analysis
        state.pending_queries = {} if analysis.sufficient_coverage else tasks_to_queries(analysis.follow_up_tasks, state.enabled_sources)
    update_stage(
        state,
        key="gap",
        label="Rechercheluecken pruefen",
        agent="GapAnalysisAgent",
        status="complete",
        detail="Trefferlage ist ausreichend." if analysis.sufficient_coverage else f"{len(analysis.follow_up_tasks)} Folgeaufgaben geplant.",
        metadata={"missing_angles": analysis.missing_angles},
    )
    upsert_artifact(
        state,
        artifact_service,
        key="research-gaps",
        title="Gap-Analyse",
        kind="analysis",
        content=_format_gap_artifact(analysis),
        metadata={"follow_up_count": len(analysis.follow_up_tasks)},
    )
    return None


def _run_reranker(state: ResearchWorkflowState) -> None:
    ordered = [state.source_results.get(source, []) for source in state.enabled_sources]
    with state.lock:
        state.merged_results = merge_results(*ordered, limit=state.payload.request.max_results)
        state.summary = f"{len(state.merged_results)} priorisierte Treffer liegen vor."
    update_stage(
        state,
        key="rerank",
        label="Treffer konsolidieren",
        agent="Reranker",
        status="complete",
        detail=f"{len(state.merged_results)} Treffer priorisiert und dedupliziert.",
    )
    return None


def _run_synthesis(state: ResearchWorkflowState, llm: OpenRouterClient, artifact_service) -> None:
    if not state.merged_results:
        state.summary = "Keine belastbaren Treffer gefunden. Bitte Suchanfrage, Quellenfilter oder OpenRouter-Konfiguration pruefen."
        update_stage(state, key="synthesis", label="Memo formulieren", agent="SynthesisAgent", status="failed", detail=state.summary)
        return None
    memo = None
    if llm.is_configured:
        try:
            memo = llm.generate_json(
                system_prompt=synthesis_system_prompt(),
                user_prompt=synthesis_user_prompt(state),
                response_model=ResearchMemo,
                temperature=0.1,
            )
        except OpenRouterError:
            state.used_live_llm = False
    state.summary = _format_summary(state, memo)
    update_stage(state, key="synthesis", label="Memo formulieren", agent="SynthesisAgent", status="complete", detail=state.summary)
    upsert_artifact(
        state,
        artifact_service,
        key="research-memo",
        title="Research Memo",
        kind="memo",
        content=_format_memo_artifact(state, memo),
        metadata={"result_count": len(state.merged_results)},
    )
    upsert_artifact(
        state,
        artifact_service,
        key="reasoning-digest",
        title="Reasoning Digest",
        kind="reasoning",
        content=format_reasoning_digest(state),
        metadata={"step_count": len(state.trace)},
    )
    return None


def _consume_queries(state: ResearchWorkflowState, source: ResearchSource) -> list[str]:
    with state.lock:
        queries = state.pending_queries.get(source, [])
        state.pending_queries[source] = []
        if not queries:
            return []
        executed = state.executed_queries.setdefault(source, [])
        fresh_queries = [query for query in queries if query not in executed]
        executed.extend(fresh_queries)
    return fresh_queries


def _notify(on_update: StateUpdateHandler | None, state: ResearchWorkflowState) -> None:
    if on_update is None:
        return
    on_update(state)


def _search_agent_name(source: ResearchSource) -> str:
    return {
        ResearchSource.FEDERAL_LAW: "FederalLawSearchAgent",
        ResearchSource.CASE_LAW: "CaseLawSearchAgent",
        ResearchSource.EU_LAW: "EuLawSearchAgent",
        ResearchSource.INTERNAL_DOCS: "InternalDocsSearchAgent",
    }[source]


def _format_summary(state: ResearchWorkflowState, memo: ResearchMemo | None) -> str:
    source_counts = ", ".join(
        f"{SOURCE_LABELS[source]}: {len(state.source_results.get(source, []))}" for source in state.enabled_sources if state.source_results.get(source)
    )
    mode = "LLM-Modus" if state.used_live_llm else "Fallback-Modus"
    if memo is None:
        top_hits = "; ".join(hit.title for hit in state.merged_results[:3])
        return f"Deep Research ({mode}) abgeschlossen. Quellenverteilung: {source_counts}. Top-Treffer: {top_hits}."
    findings = "; ".join(finding.title for finding in memo.findings[:3])
    questions = " | Offene Punkte: " + "; ".join(memo.open_questions[:2]) if memo.open_questions else ""
    return f"Deep Research ({mode}) abgeschlossen. {memo.executive_summary} | Quellen: {source_counts}. | Kernergebnisse: {findings}.{questions}"


def _format_plan_artifact(plan) -> str:
    lines = [f"# {plan.objective}", "", plan.search_strategy, ""]
    for task in plan.tasks:
        lines.append(f"- [{task.source.value}] {task.query}")
        lines.append(f"  - {task.rationale}")
    return "\n".join(lines)


def _format_gap_artifact(analysis) -> str:
    lines = ["# Gap-Analyse", ""]
    if analysis.sufficient_coverage:
        lines.append("Die Recherche deckt die Kernfragen bereits belastbar ab.")
        return "\n".join(lines)
    if analysis.missing_angles:
        lines.append("## Offene Blickwinkel")
        lines.extend(f"- {item}" for item in analysis.missing_angles)
        lines.append("")
    if analysis.follow_up_tasks:
        lines.append("## Folgeaufgaben")
        lines.extend(f"- [{task.source.value}] {task.query}" for task in analysis.follow_up_tasks)
    return "\n".join(lines)


def _format_memo_artifact(state: ResearchWorkflowState, memo: ResearchMemo | None) -> str:
    lines = ["# Research Memo", "", state.summary, ""]
    if memo is not None:
        if memo.findings:
            lines.append("## Kernergebnisse")
            lines.extend(f"- {finding.title}: {finding.summary}" for finding in memo.findings)
            lines.append("")
        if memo.open_questions:
            lines.append("## Offene Fragen")
            lines.extend(f"- {question}" for question in memo.open_questions)
            lines.append("")
    lines.append("## Top-Quellen")
    for hit in state.merged_results[:8]:
        citation = f" ({hit.citation})" if hit.citation else ""
        lines.append(f"- {hit.title}{citation}")
    return "\n".join(lines)
