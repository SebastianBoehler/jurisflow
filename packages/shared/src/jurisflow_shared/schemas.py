from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from jurisflow_shared.types import (
    DeadlineKind,
    DocumentKind,
    DocumentProcessingStatus,
    DraftKind,
    MatterStatus,
    ResearchSource,
)


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class MatterCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=2_000)


class MatterRead(ORMBase):
    id: UUID
    tenant_id: UUID
    title: str
    description: str | None
    status: MatterStatus
    created_at: datetime
    updated_at: datetime


class DocumentRead(ORMBase):
    id: UUID
    matter_id: UUID
    tenant_id: UUID
    title: str
    kind: DocumentKind
    processing_status: DocumentProcessingStatus
    summary: str | None
    created_at: datetime
    updated_at: datetime


class DeadlineRead(ORMBase):
    id: UUID
    matter_id: UUID
    tenant_id: UUID
    kind: DeadlineKind
    label: str
    due_date: date | None
    source_excerpt: str | None
    created_at: datetime


class EvidenceItemRead(ORMBase):
    id: UUID
    matter_id: UUID
    tenant_id: UUID
    label: str
    title: str
    position: int
    created_at: datetime


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12_000)


class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2_000)
    focus: str | None = Field(default=None, max_length=1_000)
    sources: list[ResearchSource] = Field(default_factory=list)
    filters: dict[str, str | bool | list[str]] = Field(default_factory=dict)
    max_results: int = Field(default=8, ge=1, le=20)
    deep_research: bool = True
    history: list[ConversationTurn] = Field(default_factory=list)


class ResearchTraceStepRead(BaseModel):
    key: str
    label: str
    agent: str
    status: str
    detail: str | None = None
    source: ResearchSource | None = None
    kind: str = "stage"
    started_at: datetime | None = None
    finished_at: datetime | None = None
    metadata: dict[str, str | int | float | bool | list[str]] = Field(default_factory=dict)


class ResearchArtifactRead(BaseModel):
    key: str
    kind: str
    title: str
    content: str
    metadata: dict[str, str | int | float | bool | list[str]] = Field(default_factory=dict)


class ResearchResultRead(ORMBase):
    id: UUID
    research_run_id: UUID
    source: ResearchSource
    title: str
    citation: str | None
    excerpt: str
    relevance_score: float
    url: str | None


class ResearchRunRead(ORMBase):
    id: UUID
    matter_id: UUID
    tenant_id: UUID
    query: str
    focus: str | None = None
    sources: list[ResearchSource] = Field(default_factory=list)
    filters: dict[str, str | bool | list[str]] = Field(default_factory=dict)
    max_results: int = 8
    deep_research: bool = True
    status: str
    summary: str | None
    trace: list[ResearchTraceStepRead] = Field(default_factory=list)
    artifacts: list[ResearchArtifactRead] = Field(default_factory=list)
    created_at: datetime


class DraftCreate(BaseModel):
    kind: DraftKind
    title: str = Field(min_length=3, max_length=200)
    prompt: str | None = Field(default=None, max_length=4_000)


class DraftRead(ORMBase):
    id: UUID
    matter_id: UUID
    tenant_id: UUID
    kind: DraftKind
    title: str
    status: str
    content: str
    created_at: datetime
