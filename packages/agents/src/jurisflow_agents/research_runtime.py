"""Research workflow orchestrator — connects pipeline graph to stage handlers."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable

from google.adk.agents import BaseAgent, LoopAgent, ParallelAgent, SequentialAgent

from jurisflow_agents.llm import StructuredLLMClient
from jurisflow_agents.research_observability import create_artifact_service, seed_trace
from jurisflow_agents.research_pipeline import build_research_pipeline
from jurisflow_agents.research_search import run_internal_docs_search, run_source_search
from jurisflow_agents.research_stages import (
    run_gap_analysis,
    run_reranker,
    run_reconnaissance,
    run_router,
    run_synthesis,
)
from jurisflow_agents.research_types import ResearchWorkflowInput, ResearchWorkflowState
from jurisflow_retrieval.types import RetrievalHit
from jurisflow_shared import ResearchSource

AgentHandler = Callable[[ResearchWorkflowState], list[RetrievalHit] | None]
StateUpdateHandler = Callable[[ResearchWorkflowState], None]


def run_research_workflow(
    workflow_input: ResearchWorkflowInput,
    *,
    on_update: StateUpdateHandler | None = None,
) -> ResearchWorkflowState:
    llm = StructuredLLMClient()
    artifact_service = create_artifact_service()
    state = ResearchWorkflowState(payload=workflow_input, used_live_llm=llm.is_configured)
    seed_trace(state)
    state.summary = "Deep Research wird vorbereitet."
    _notify(on_update, state)
    handlers: dict[str, AgentHandler] = {
        "ReconnaissanceAgent": run_reconnaissance,
        "RouterAgent": lambda s: run_router(s, llm, artifact_service),
        "FederalLawSearchAgent": lambda s: run_source_search(s, ResearchSource.FEDERAL_LAW),
        "StateLawSearchAgent": lambda s: run_source_search(s, ResearchSource.STATE_LAW),
        "CaseLawSearchAgent": lambda s: run_source_search(s, ResearchSource.CASE_LAW),
        "EuLawSearchAgent": lambda s: run_source_search(s, ResearchSource.EU_LAW),
        "InternalDocsSearchAgent": run_internal_docs_search,
        "GapAnalysisAgent": lambda s: run_gap_analysis(s, llm, artifact_service),
        "Reranker": run_reranker,
        "SynthesisAgent": lambda s: run_synthesis(s, llm, artifact_service),
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
            futures = [
                executor.submit(_execute_agent, sub_agent, state, handlers, None)
                for sub_agent in agent.sub_agents
            ]
            for future in as_completed(futures):
                future.result()
                _notify(on_update, state)
        return None

    handler = handlers.get(agent.name)
    return handler(state) if handler else None


def _notify(on_update: StateUpdateHandler | None, state: ResearchWorkflowState) -> None:
    if on_update is not None:
        on_update(state)
