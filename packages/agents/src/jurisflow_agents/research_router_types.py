from pydantic import BaseModel, Field

from jurisflow_shared import ResearchSource


class ResearchSourceRoute(BaseModel):
    source: ResearchSource
    rationale: str = Field(min_length=3, max_length=240)
    primary_query: str = Field(min_length=3, max_length=400)
    refinement_query: str | None = Field(default=None, max_length=400)
    required_terms: list[str] = Field(default_factory=list, max_length=8)


class ResearchRoutePlan(BaseModel):
    objective: str = Field(min_length=3, max_length=400)
    search_strategy: str = Field(min_length=3, max_length=600)
    legal_anchors: list[str] = Field(default_factory=list, max_length=10)
    jurisdiction_hints: list[str] = Field(default_factory=list, max_length=6)
    key_issues: list[str] = Field(default_factory=list, max_length=8)
    source_routes: list[ResearchSourceRoute] = Field(default_factory=list, max_length=12)
