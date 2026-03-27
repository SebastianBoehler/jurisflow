"""One function per research pipeline stage, called by the workflow orchestrator."""
from __future__ import annotations

from sqlalchemy import select

from jurisflow_agents.llm import StructuredLLMClient, StructuredLLMError
from jurisflow_agents.research_formatting import (
    format_gap_artifact,
    format_memo_artifact,
    format_plan_artifact,
    format_report_artifact,
    format_summary,
)
from jurisflow_agents.research_llm_types import ResearchMemo
from jurisflow_agents.research_observability import (
    format_reasoning_digest,
    update_stage,
    upsert_artifact,
)
from jurisflow_agents.research_prompts import (
    gap_system_prompt,
    gap_user_prompt,
    planner_response_model,
    planner_system_prompt,
    planner_user_prompt,
    synthesis_system_prompt,
    synthesis_user_prompt,
)
from jurisflow_agents.research_reconnaissance import (
    build_reconnaissance_request,
    should_run_reconnaissance,
    summarize_reconnaissance_hits,
)
from jurisflow_agents.research_router import (
    fallback_route_plan,
    route_plan_to_queries,
    should_run_refinement,
)
from jurisflow_agents.research_support import (
    SOURCE_LABELS,
    fallback_gap_analysis,
    merge_query_sets,
    score_internal_chunk,
    tasks_to_queries,
    tokenize,
)
from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_db.models import Document, DocumentChunk
from jurisflow_db.session import get_session_factory
from jurisflow_retrieval import merge_results
from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.providers.case_law import CaseLawProvider
from jurisflow_retrieval.providers.dejure import DejureProvider
from jurisflow_retrieval.providers.eurlex import EurLexProvider
from jurisflow_retrieval.providers.federal import FederalLawProvider
from jurisflow_retrieval.providers.firecrawl import FirecrawlProvider
from jurisflow_retrieval.providers.general_web import GeneralWebSearchProvider
from jurisflow_retrieval.providers.openjur import OpenJurProvider
from jurisflow_retrieval.providers.state_law import StateLawProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import ResearchSource
from jurisflow_shared.config import get_settings


# ---------------------------------------------------------------------------
# Provider & query helpers (used only by stage functions)
# ---------------------------------------------------------------------------

def build_source_providers(source: ResearchSource) -> list[ResearchProvider]:
    """Return an ordered list of providers for the given source."""
    settings = get_settings()
    if source == ResearchSource.CASE_LAW:
        return [CaseLawProvider(), OpenJurProvider()]
    if source == ResearchSource.GENERAL_WEB:
        providers: list[ResearchProvider] = [GeneralWebSearchProvider()]
        if settings.firecrawl_api_key:
            providers.append(FirecrawlProvider(settings.firecrawl_api_key))
        return providers
    return {
        ResearchSource.FEDERAL_LAW: [FederalLawProvider(), DejureProvider()],
        ResearchSource.STATE_LAW: [StateLawProvider()],
        ResearchSource.EU_LAW: [EurLexProvider()],
    }.get(source, [GeneralWebSearchProvider()])


def consume_queries(state: ResearchWorkflowState, source: ResearchSource) -> list[str]:
    with state.lock:
        queries = state.pending_queries.get(source, [])
        state.pending_queries[source] = []
        if not queries:
            return []
        executed = state.executed_queries.setdefault(source, [])
        fresh_queries = [q for q in queries if q not in executed]
        executed.extend(fresh_queries)
    return fresh_queries


def search_agent_name(source: ResearchSource) -> str:
    return {
        ResearchSource.FEDERAL_LAW: "FederalLawSearchAgent",
        ResearchSource.STATE_LAW: "StateLawSearchAgent",
        ResearchSource.CASE_LAW: "CaseLawSearchAgent",
        ResearchSource.EU_LAW: "EuLawSearchAgent",
        ResearchSource.INTERNAL_DOCS: "InternalDocsSearchAgent",
        ResearchSource.GENERAL_WEB: "GeneralWebSearchAgent",
    }[source]


# ---------------------------------------------------------------------------
# Stage handlers
# ---------------------------------------------------------------------------

def run_reconnaissance(state: ResearchWorkflowState) -> None:
    if not should_run_reconnaissance(state.payload.request.query, state.payload.request.focus, state.requested_sources):
        update_stage(
            state,
            key="recon",
            label="Web-Recherche zur Orientierung",
            agent="ReconnaissanceAgent",
            status="skipped",
            detail="Keine vorgelagerte Web-Recherche noetig.",
        )
        return None
    provider = GeneralWebSearchProvider()
    try:
        hits = provider.search_reconnaissance(
            build_reconnaissance_request(
                state.payload.request.query,
                state.payload.request.focus,
                state.payload.request.max_results,
            )
        )
    except Exception as exc:
        update_stage(
            state,
            key="recon",
            label="Web-Recherche zur Orientierung",
            agent="ReconnaissanceAgent",
            status="failed",
            detail=str(exc)[:180],
        )
        return None
    with state.lock:
        state.reconnaissance_hits = hits
        state.reconnaissance_summary = summarize_reconnaissance_hits(hits)
    update_stage(
        state,
        key="recon",
        label="Web-Recherche zur Orientierung",
        agent="ReconnaissanceAgent",
        status="complete" if hits else "skipped",
        detail=f"{len(hits)} Orientierungstreffer fuer die Planung identifiziert." if hits else "Keine belastbaren Orientierungstreffer gefunden.",
        metadata={"result_count": len(hits)},
    )
    return None


def run_router(state: ResearchWorkflowState, llm: StructuredLLMClient, artifact_service) -> None:
    state.normalized_query = " ".join(state.payload.request.query.split())
    route_plan = fallback_route_plan(state)
    if llm.is_configured:
        try:
            route_plan = llm.generate_json(
                system_prompt=planner_system_prompt(),
                user_prompt=planner_user_prompt(
                    state.payload.request.query,
                    state.payload.request.focus,
                    state.enabled_sources,
                    state.payload.request.max_results,
                    state.reconnaissance_summary or None,
                ),
                response_model=planner_response_model(),
            )
        except StructuredLLMError as exc:
            state.summary = f"LLM-Routing nicht verfuegbar, deterministische Routing-Logik aktiv: {str(exc)[:180]}"
            state.used_live_llm = False
    fallback_route = fallback_route_plan(state)
    with state.lock:
        state.route_plan = route_plan
        state.pending_queries = merge_query_sets(
            route_plan_to_queries(route_plan, state.enabled_sources),
            route_plan_to_queries(fallback_route, state.enabled_sources),
        )
        state.summary = "Routing und Rechercheplan erstellt."
        planned_query_count = sum(len(queries) for queries in state.pending_queries.values())
        planned_source_count = sum(1 for queries in state.pending_queries.values() if queries)
    update_stage(
        state,
        key="planner",
        label="Routing und Rechercheplan erstellen",
        agent="RouterAgent",
        status="complete",
        detail=f"{planned_query_count} ausfuehrbare Suchanfragen ueber {planned_source_count} Quellen geplant.",
        metadata={"strategy": route_plan.search_strategy, "anchors": route_plan.legal_anchors[:6]},
    )
    upsert_artifact(
        state,
        artifact_service,
        key="research-plan",
        title="Routing und Rechercheplan",
        kind="plan",
        content=format_plan_artifact(route_plan),
        metadata={"task_count": len(route_plan.source_routes)},
    )
    return None


def run_source_search(state: ResearchWorkflowState, source: ResearchSource) -> list[RetrievalHit]:
    if source not in state.enabled_sources:
        update_stage(
            state,
            key=f"search:{source.value}",
            label=f"{SOURCE_LABELS[source]} durchsuchen",
            agent=search_agent_name(source),
            status="skipped",
            source=source,
            detail="Keine Suchanfragen fuer diese Quelle vorhanden.",
        )
        return []
    queries = consume_queries(state, source)
    if not queries:
        with state.lock:
            executed_query_count = len(state.executed_queries.get(source, []))
            result_count = len(state.source_results.get(source, []))
        if executed_query_count or result_count:
            update_stage(
                state,
                key=f"search:{source.value}",
                label=f"{SOURCE_LABELS[source]} durchsuchen",
                agent=search_agent_name(source),
                status="complete",
                source=source,
                detail=f"Keine weiteren Suchanfragen in dieser Runde. Bisher {result_count} Treffer aus {executed_query_count} Suchanfragen.",
                metadata={"queries": state.executed_queries.get(source, []), "result_count": result_count},
            )
            return []
        update_stage(
            state,
            key=f"search:{source.value}",
            label=f"{SOURCE_LABELS[source]} durchsuchen",
            agent=search_agent_name(source),
            status="skipped",
            source=source,
            detail="Keine Suchanfragen fuer diese Quelle vorhanden.",
        )
        return []
    providers = build_source_providers(source)
    hits: list[RetrievalHit] = []
    errors: list[str] = []
    executed_queries: list[str] = []
    max_results = max(2, state.payload.request.max_results // max(1, len(queries)))
    for index, query in enumerate(queries):
        if index > 0 and not should_run_refinement(source, len(hits), len(queries)):
            break
        search_req = SearchRequest(query=query, focus=None, max_results=max_results, filters=state.payload.request.filters)
        executed_queries.append(query)
        for provider in providers:
            try:
                hits.extend(provider.search(search_req))
            except Exception as exc:
                errors.append(str(exc))
    with state.lock:
        state.source_results[source] = merge_results(state.source_results.get(source, []), hits, limit=state.payload.request.max_results)
        if errors:
            state.source_errors[source] = errors[0][:240]
    if errors and not hits:
        stage_status = "failed"
        stage_detail = errors[0][:160]
    elif errors:
        stage_status = "complete"
        stage_detail = f"{len(hits)} Treffer aus {len(executed_queries)} Suchanfragen. Hinweis: {errors[0][:120]}"
    else:
        stage_status = "complete"
        stage_detail = f"{len(hits)} Treffer aus {len(executed_queries)} Suchanfragen zusammengefuehrt."
    update_stage(
        state,
        key=f"search:{source.value}",
        label=f"{SOURCE_LABELS[source]} durchsuchen",
        agent=search_agent_name(source),
        status=stage_status,
        detail=stage_detail,
        source=source,
        metadata={"queries": executed_queries, "planned_queries": queries, "result_count": len(hits)},
    )
    return hits


def run_internal_docs_search(state: ResearchWorkflowState) -> list[RetrievalHit]:
    source = ResearchSource.INTERNAL_DOCS
    if source not in state.enabled_sources:
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
    queries = consume_queries(state, source)
    if not queries:
        with state.lock:
            executed_query_count = len(state.executed_queries.get(source, []))
            result_count = len(state.source_results.get(source, []))
        if executed_query_count or result_count:
            update_stage(
                state,
                key=f"search:{source.value}",
                label=f"{SOURCE_LABELS[source]} durchsuchen",
                agent="InternalDocsSearchAgent",
                status="complete",
                source=source,
                detail=f"Keine weiteren internen Suchanfragen in dieser Runde. Bisher {result_count} Fundstellen aus {executed_query_count} Suchanfragen.",
                metadata={"queries": state.executed_queries.get(source, []), "result_count": result_count},
            )
            return []
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


def run_gap_analysis(state: ResearchWorkflowState, llm: StructuredLLMClient, artifact_service) -> None:
    if not state.payload.request.deep_research:
        update_stage(state, key="gap", label="Rechercheluecken pruefen", agent="GapAnalysisAgent", status="skipped", detail="Deep Research ist deaktiviert.")
        with state.lock:
            state.pending_queries = {}
        return None
    run_reranker(state)
    analysis = fallback_gap_analysis(state)
    if llm.is_configured and state.merged_results:
        try:
            analysis = llm.generate_json(
                system_prompt=gap_system_prompt(),
                user_prompt=gap_user_prompt(state),
                response_model=type(analysis),
            )
        except StructuredLLMError:
            state.used_live_llm = False
    if state.iteration > 0:
        with state.lock:
            state.gap_analysis = analysis
            state.pending_queries = {}
        update_stage(
            state,
            key="gap",
            label="Rechercheluecken pruefen",
            agent="GapAnalysisAgent",
            status="complete",
            detail="Zweite Suchrunde abgeschlossen.",
            metadata={"missing_angles": analysis.missing_angles},
        )
        upsert_artifact(
            state,
            artifact_service,
            key="research-gaps",
            title="Gap-Analyse",
            kind="analysis",
            content=format_gap_artifact(analysis),
            metadata={"follow_up_count": len(analysis.follow_up_tasks)},
        )
        return None
    with state.lock:
        state.gap_analysis = analysis
        state.pending_queries = (
            {}
            if analysis.sufficient_coverage
            else merge_query_sets(
                tasks_to_queries(analysis.follow_up_tasks, state.enabled_sources),
                tasks_to_queries(fallback_gap_analysis(state).follow_up_tasks, state.enabled_sources),
            )
        )
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
        content=format_gap_artifact(analysis),
        metadata={"follow_up_count": len(analysis.follow_up_tasks)},
    )
    return None


def run_reranker(state: ResearchWorkflowState) -> None:
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


def run_synthesis(state: ResearchWorkflowState, llm: StructuredLLMClient, artifact_service) -> None:
    if not state.merged_results:
        state.summary = "Keine belastbaren Treffer gefunden. Bitte Suchanfrage, Quellenfilter oder die Modellkonfiguration pruefen."
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
        except StructuredLLMError:
            state.used_live_llm = False
    state.summary = format_summary(state, memo)
    update_stage(state, key="synthesis", label="Memo formulieren", agent="SynthesisAgent", status="complete", detail=state.summary)
    upsert_artifact(
        state,
        artifact_service,
        key="final-report",
        title="Final Report",
        kind="report",
        content=format_report_artifact(state, memo),
        metadata={"result_count": len(state.merged_results)},
    )
    upsert_artifact(
        state,
        artifact_service,
        key="research-memo",
        title="Research Memo",
        kind="memo",
        content=format_memo_artifact(state, memo),
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
