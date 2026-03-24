from dataclasses import dataclass, field
from threading import Lock
from uuid import UUID

from jurisflow_agents.research_llm_types import ResearchGapAnalysis, ResearchPlan
from jurisflow_retrieval.types import RetrievalHit
from jurisflow_shared import ResearchRequest, ResearchSource


@dataclass(slots=True)
class ResearchWorkflowInput:
    tenant_id: UUID
    matter_id: UUID
    request: ResearchRequest


@dataclass(slots=True)
class ResearchWorkflowState:
    payload: ResearchWorkflowInput
    normalized_query: str = ""
    plan: ResearchPlan | None = None
    gap_analysis: ResearchGapAnalysis | None = None
    pending_queries: dict[ResearchSource, list[str]] = field(default_factory=dict)
    executed_queries: dict[ResearchSource, list[str]] = field(default_factory=dict)
    source_results: dict[ResearchSource, list[RetrievalHit]] = field(default_factory=dict)
    source_errors: dict[ResearchSource, str] = field(default_factory=dict)
    merged_results: list[RetrievalHit] = field(default_factory=list)
    trace: list[dict] = field(default_factory=list)
    artifacts: list[dict] = field(default_factory=list)
    summary: str = ""
    iteration: int = 0
    used_live_llm: bool = False
    lock: Lock = field(default_factory=Lock, repr=False)

    @property
    def enabled_sources(self) -> list[ResearchSource]:
        if self.payload.request.sources:
            return list(self.payload.request.sources)
        return [
            ResearchSource.FEDERAL_LAW,
            ResearchSource.CASE_LAW,
            ResearchSource.EU_LAW,
            ResearchSource.INTERNAL_DOCS,
        ]
