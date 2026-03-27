"""Planning, synthesis, and reranking stages for the research workflow."""
from __future__ import annotations

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
from jurisflow_agents.research_router import fallback_route_plan, route_plan_to_queries
from jurisflow_agents.research_support import fallback_gap_analysis, merge_query_sets, tasks_to_queries
from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_retrieval import merge_results
from jurisflow_retrieval.providers.general_web import GeneralWebSearchProvider


def run_reconnaissance(state: ResearchWorkflowState) -> None:
    query = state.contextual_query or state.payload.request.query
    if not should_run_reconnaissance(query, state.payload.request.focus, state.requested_sources):
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
                query,
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
        detail=(
            f"{len(hits)} Orientierungstreffer fuer die Planung identifiziert."
            if hits
            else "Keine belastbaren Orientierungstreffer gefunden."
        ),
        metadata={"result_count": len(hits)},
    )
    return None


def run_router(state: ResearchWorkflowState, llm: StructuredLLMClient, artifact_service) -> None:
    contextual_query = state.contextual_query or state.payload.request.query
    state.normalized_query = " ".join(contextual_query.split())
    route_plan = fallback_route_plan(state)

    if llm.is_configured:
        try:
            route_plan = llm.generate_json(
                system_prompt=planner_system_prompt(),
                user_prompt=planner_user_prompt(
                    contextual_query,
                    state.payload.request.focus,
                    state.enabled_sources,
                    state.payload.request.max_results,
                    state.conversation_transcript or None,
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


def run_gap_analysis(state: ResearchWorkflowState, llm: StructuredLLMClient, artifact_service) -> None:
    if not state.payload.request.deep_research:
        update_stage(
            state,
            key="gap",
            label="Rechercheluecken pruefen",
            agent="GapAnalysisAgent",
            status="skipped",
            detail="Deep Research ist deaktiviert.",
        )
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
        detail=(
            "Trefferlage ist ausreichend."
            if analysis.sufficient_coverage
            else f"{len(analysis.follow_up_tasks)} Folgeaufgaben geplant."
        ),
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
