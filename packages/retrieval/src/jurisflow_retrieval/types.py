from dataclasses import dataclass, field

from jurisflow_shared.types import ResearchSource


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
    url: str | None = None
