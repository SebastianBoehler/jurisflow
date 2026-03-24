from pydantic import BaseModel, Field

from jurisflow_shared import ResearchSource


class ResearchSearchTask(BaseModel):
    source: ResearchSource
    query: str = Field(min_length=3, max_length=400)
    rationale: str = Field(min_length=3, max_length=280)
    priority: int = Field(default=1, ge=1, le=5)


class ResearchPlan(BaseModel):
    objective: str = Field(min_length=3, max_length=400)
    search_strategy: str = Field(min_length=3, max_length=600)
    key_terms: list[str] = Field(default_factory=list, max_length=12)
    tasks: list[ResearchSearchTask] = Field(default_factory=list, max_length=12)


class ResearchGapAnalysis(BaseModel):
    sufficient_coverage: bool = False
    missing_angles: list[str] = Field(default_factory=list, max_length=6)
    follow_up_tasks: list[ResearchSearchTask] = Field(default_factory=list, max_length=8)


class ResearchFinding(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    analysis: str = Field(min_length=3, max_length=800)
    authorities: list[str] = Field(default_factory=list, max_length=6)


class ResearchMemo(BaseModel):
    executive_summary: str = Field(min_length=3, max_length=1200)
    legal_framework: str = Field(min_length=3, max_length=1200)
    factual_support: str = Field(min_length=3, max_length=1200)
    findings: list[ResearchFinding] = Field(default_factory=list, max_length=6)
    open_questions: list[str] = Field(default_factory=list, max_length=6)
    recommended_next_steps: list[str] = Field(default_factory=list, max_length=6)
