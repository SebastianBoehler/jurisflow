from dataclasses import dataclass, field
from uuid import UUID

from jurisflow_shared.types import AuthorityLevel, ModalityType, ResearchSource


@dataclass(slots=True)
class SearchRequest:
    query: str
    max_results: int = 5
    focus: str | None = None
    filters: dict[str, str | bool | list[str]] = field(default_factory=dict)


@dataclass(slots=True)
class RetrievalHit:
    source: ResearchSource
    title: str
    excerpt: str
    citation: str | None = None
    relevance_score: float = 0.0
    source_id: str | None = None
    citations: list[str] = field(default_factory=list)
    authority: AuthorityLevel | None = None
    modality: ModalityType = ModalityType.TEXT
    document_id: UUID | None = None
    chunk_id: UUID | None = None
    url: str | None = None

    def __post_init__(self) -> None:
        if self.authority is None:
            self.authority = _default_authority(self.source)
        if not self.citations and self.citation:
            self.citations = [self.citation]
        if self.source_id is None:
            self.source_id = self.url


def _default_authority(source: ResearchSource) -> AuthorityLevel:
    if source in {ResearchSource.FEDERAL_LAW, ResearchSource.STATE_LAW, ResearchSource.EU_LAW}:
        return AuthorityLevel.PRIMARY
    if source is ResearchSource.CASE_LAW:
        return AuthorityLevel.CASELAW
    if source is ResearchSource.INTERNAL_DOCS:
        return AuthorityLevel.FACTUAL
    return AuthorityLevel.SECONDARY
