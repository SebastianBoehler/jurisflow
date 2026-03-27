import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from jurisflow_db.base import Base
from jurisflow_shared.types import DeadlineKind, DraftKind, ResearchSource


class Deadline(Base):
    __tablename__ = "deadlines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    matter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matters.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("documents.id", ondelete="SET NULL"))
    kind: Mapped[str] = mapped_column(String(50), default=DeadlineKind.OTHER.value, nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    source_excerpt: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ResearchRun(Base):
    __tablename__ = "research_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    matter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matters.id", ondelete="CASCADE"), nullable=False)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    focus: Mapped[str | None] = mapped_column(Text)
    sources: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    filters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    max_results: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    deep_research: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="queued", nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    trace: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    artifacts: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ResearchResult(Base):
    __tablename__ = "research_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    research_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("research_runs.id", ondelete="CASCADE"), nullable=False)
    source: Mapped[str] = mapped_column(String(50), default=ResearchSource.INTERNAL_DOCS.value, nullable=False)
    source_id: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    citation: Mapped[str | None] = mapped_column(Text)
    citations: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    authority: Mapped[str | None] = mapped_column(String(50))
    modality: Mapped[str] = mapped_column(String(50), default="text", nullable=False)
    document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    chunk_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    matter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matters.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), default=DraftKind.LEGAL_MEMO.value, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="queued", nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    matter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matters.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("documents.id", ondelete="SET NULL"))
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
