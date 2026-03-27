import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from jurisflow_db.base import Base
from jurisflow_shared.types import DocumentKind, DocumentProcessingStatus


class StoredFile(Base):
    __tablename__ = "stored_files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    matter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matters.id", ondelete="CASCADE"), nullable=False)
    stored_file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stored_files.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), default=DocumentKind.UNKNOWN.value, nullable=False)
    processing_status: Mapped[str] = mapped_column(
        String(50),
        default=DocumentProcessingStatus.UPLOADED.value,
        nullable=False,
    )
    classification: Mapped[str | None] = mapped_column(String(80))
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    keywords: Mapped[str | None] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DocumentExtraction(Base):
    __tablename__ = "document_extractions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    parties: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    key_dates: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    deadlines: Mapped[list[dict]] = mapped_column(JSONB, default=list, nullable=False)
    statute_references: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
