import asyncio
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from inspect import isawaitable

from google.adk.artifacts import InMemoryArtifactService
from google.genai import types

from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_agents.research_support import SOURCE_LABELS
from jurisflow_shared import ResearchSource


def create_artifact_service() -> InMemoryArtifactService:
    return InMemoryArtifactService()


def seed_trace(state: ResearchWorkflowState) -> None:
    update_stage(state, key="planner", label="Rechercheplan erstellen", agent="QueryPlannerAgent", status="pending")
    for source in state.enabled_sources:
        update_stage(
            state,
            key=f"search:{source.value}",
            label=f"{SOURCE_LABELS[source]} durchsuchen",
            agent=_search_agent_name(source),
            status="pending",
            source=source,
        )
    update_stage(state, key="gap", label="Rechercheluecken pruefen", agent="GapAnalysisAgent", status="pending")
    update_stage(state, key="rerank", label="Treffer konsolidieren", agent="Reranker", status="pending")
    update_stage(state, key="synthesis", label="Memo formulieren", agent="SynthesisAgent", status="pending")


def update_stage(
    state: ResearchWorkflowState,
    *,
    key: str,
    label: str,
    agent: str,
    status: str,
    detail: str | None = None,
    source: ResearchSource | None = None,
    kind: str = "stage",
    metadata: dict | None = None,
) -> None:
    now = datetime.now(UTC)
    with state.lock:
        existing = next((item for item in state.trace if item["key"] == key), None)
        payload = {
            "key": key,
            "label": label,
            "agent": agent,
            "status": status,
            "detail": detail,
            "source": source.value if source else None,
            "kind": kind,
            "started_at": now.isoformat() if existing is None else existing["started_at"],
            "finished_at": now.isoformat() if status in {"complete", "failed", "skipped"} else None,
            "metadata": metadata or {},
        }
        if existing is None:
            state.trace.append(payload)
            return
        existing.update(payload)


def upsert_artifact(
    state: ResearchWorkflowState,
    artifact_service: InMemoryArtifactService,
    *,
    key: str,
    title: str,
    kind: str,
    content: str,
    metadata: dict | None = None,
) -> None:
    save_result = artifact_service.save_artifact(
        app_name="jurisflow-research",
        user_id=str(state.payload.tenant_id),
        session_id=str(state.payload.matter_id),
        filename=f"{key}.md",
        artifact=types.Part.from_text(text=content),
        custom_metadata=metadata or {},
    )
    if isawaitable(save_result):
        _resolve_artifact_save(save_result)
    with state.lock:
        existing = next((item for item in state.artifacts if item["key"] == key), None)
        payload = {"key": key, "title": title, "kind": kind, "content": content, "metadata": metadata or {}}
        if existing is None:
            state.artifacts.append(payload)
            return
        existing.update(payload)


def snapshot_state(state: ResearchWorkflowState) -> tuple[list[dict], list[dict], str]:
    with state.lock:
        return deepcopy(state.trace), deepcopy(state.artifacts), state.summary


def format_reasoning_digest(state: ResearchWorkflowState) -> str:
    lines = []
    for step in state.trace:
        if step["detail"]:
            lines.append(f"- {step['label']}: {step['detail']}")
    return "\n".join(lines)


def _search_agent_name(source: ResearchSource) -> str:
    return {
        ResearchSource.FEDERAL_LAW: "FederalLawSearchAgent",
        ResearchSource.CASE_LAW: "CaseLawSearchAgent",
        ResearchSource.EU_LAW: "EuLawSearchAgent",
        ResearchSource.INTERNAL_DOCS: "InternalDocsSearchAgent",
    }[source]


def _resolve_artifact_save(awaitable) -> None:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(awaitable)
        return
    with ThreadPoolExecutor(max_workers=1) as executor:
        executor.submit(asyncio.run, awaitable).result()
