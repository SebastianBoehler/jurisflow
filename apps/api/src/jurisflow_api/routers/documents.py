from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from jurisflow_api.deps import get_actor_id, get_db_session, get_tenant_id
from jurisflow_api.queue import enqueue_job
from jurisflow_api.services import documents as document_service
from jurisflow_shared.schemas import DocumentRead

router = APIRouter(tags=["documents"])


@router.post("/v1/matters/{matter_id}/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    matter_id: UUID,
    upload: UploadFile = File(...),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    actor_id: UUID | None = Depends(get_actor_id),
) -> DocumentRead:
    try:
        document = await document_service.save_upload(
            session,
            tenant_id=tenant_id,
            actor_id=actor_id,
            matter_id=matter_id,
            upload=upload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    await enqueue_job("process_document", str(document.id), str(tenant_id))
    return DocumentRead.model_validate(document)


@router.get("/v1/matters/{matter_id}/documents", response_model=list[DocumentRead])
def list_documents(
    matter_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[DocumentRead]:
    documents = document_service.list_documents(session, tenant_id, matter_id)
    return [DocumentRead.model_validate(document) for document in documents]


@router.get("/v1/documents/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> DocumentRead:
    document = document_service.get_document(session, tenant_id, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return DocumentRead.model_validate(document)

