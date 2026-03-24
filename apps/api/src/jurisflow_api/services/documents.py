import mimetypes
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from jurisflow_api.services.audit import log_action
from jurisflow_db.models import Document, EvidenceItem, Matter, StoredFile
from jurisflow_shared import DocumentKind, DocumentProcessingStatus, get_settings


def infer_kind(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return {
        ".pdf": DocumentKind.PDF.value,
        ".docx": DocumentKind.DOCX.value,
        ".txt": DocumentKind.TXT.value,
        ".eml": DocumentKind.EMAIL.value,
    }.get(suffix, DocumentKind.UNKNOWN.value)


async def save_upload(
    session: Session,
    *,
    tenant_id: UUID,
    actor_id: UUID | None,
    matter_id: UUID,
    upload: UploadFile,
) -> Document:
    matter = session.get(Matter, matter_id)
    if matter is None or matter.tenant_id != tenant_id:
        raise ValueError("Matter not found.")

    settings = get_settings()
    suffix = Path(upload.filename or "upload.bin").suffix
    storage_name = f"{uuid4()}{suffix}"
    storage_path = settings.storage_root / storage_name
    content = await upload.read()
    storage_path.write_bytes(content)

    mime_type = upload.content_type or mimetypes.guess_type(upload.filename or "")[0] or "application/octet-stream"
    stored_file = StoredFile(
        tenant_id=tenant_id,
        original_filename=upload.filename or storage_name,
        mime_type=mime_type,
        storage_path=str(storage_path),
        size_bytes=len(content),
    )
    session.add(stored_file)
    session.flush()

    document = Document(
        tenant_id=tenant_id,
        matter_id=matter_id,
        stored_file_id=stored_file.id,
        title=upload.filename or storage_name,
        kind=infer_kind(upload.filename or storage_name),
        processing_status=DocumentProcessingStatus.UPLOADED.value,
    )
    session.add(document)
    session.flush()
    position = _next_evidence_position(session, tenant_id, matter_id)
    evidence = EvidenceItem(
        tenant_id=tenant_id,
        matter_id=matter_id,
        document_id=document.id,
        label=f"Anlage K{position}",
        title=document.title,
        position=position,
    )
    session.add(evidence)
    log_action(
        session,
        tenant_id=tenant_id,
        actor_id=actor_id,
        action="document.uploaded",
        entity_type="document",
        entity_id=document.id,
        details={"filename": document.title, "matter_id": str(matter_id)},
    )
    session.commit()
    session.refresh(document)
    return document


def _next_evidence_position(session: Session, tenant_id: UUID, matter_id: UUID) -> int:
    stmt = select(EvidenceItem).where(EvidenceItem.tenant_id == tenant_id, EvidenceItem.matter_id == matter_id)
    return len(list(session.scalars(stmt))) + 1


def list_documents(session: Session, tenant_id: UUID, matter_id: UUID) -> list[Document]:
    stmt = select(Document).where(Document.tenant_id == tenant_id, Document.matter_id == matter_id)
    return list(session.scalars(stmt))


def get_document(session: Session, tenant_id: UUID, document_id: UUID) -> Document | None:
    stmt = select(Document).where(Document.id == document_id, Document.tenant_id == tenant_id)
    return session.scalar(stmt)
