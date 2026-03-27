from dataclasses import dataclass, field
from threading import Lock
from uuid import UUID

from jurisflow_agents.research_llm_types import ResearchGapAnalysis, ResearchPlan
from jurisflow_agents.research_router_types import ResearchRoutePlan
from jurisflow_retrieval.types import RetrievalHit
from jurisflow_shared import ConversationTurn, ResearchRequest, ResearchSource


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
    route_plan: ResearchRoutePlan | None = None
    gap_analysis: ResearchGapAnalysis | None = None
    reconnaissance_hits: list[RetrievalHit] = field(default_factory=list)
    reconnaissance_summary: str = ""
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
    def conversation_history(self) -> list[ConversationTurn]:
        return self.payload.request.history

    @property
    def conversation_transcript(self) -> str:
        lines: list[str] = []
        for turn in self.conversation_history:
            content = " ".join(turn.content.split()).strip()
            if not content:
                continue
            speaker = "Nutzer" if turn.role == "user" else "Assistent"
            lines.append(f"{speaker}: {content}")
        return "\n".join(lines)

    @property
    def contextual_query(self) -> str:
        user_turns = [
            " ".join(turn.content.split()).strip()
            for turn in self.conversation_history
            if turn.role == "user" and turn.content.strip()
        ]
        current_query = " ".join(self.payload.request.query.split()).strip()
        return " ".join([*user_turns, current_query]).strip()

    @property
    def requested_sources(self) -> list[ResearchSource]:
        if self.payload.request.sources:
            return list(self.payload.request.sources)
        return [
            ResearchSource.FEDERAL_LAW,
            ResearchSource.STATE_LAW,
            ResearchSource.CASE_LAW,
            ResearchSource.EU_LAW,
            ResearchSource.INTERNAL_DOCS,
        ]

    @property
    def enabled_sources(self) -> list[ResearchSource]:
        official_sources = [source for source in self.requested_sources if source is not ResearchSource.GENERAL_WEB]
        if official_sources:
            return official_sources
        return [
            ResearchSource.FEDERAL_LAW,
            ResearchSource.STATE_LAW,
            ResearchSource.CASE_LAW,
        ]
