from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from jurisflow_api.deps import get_actor_id, get_db_session, get_tenant_id
from jurisflow_api.queue import enqueue_job
from jurisflow_api.services import drafts as draft_service
from jurisflow_shared import DraftCreate, DraftRead, EvidenceItemRead

router = APIRouter(tags=["drafts", "evidence"])


@router.post("/v1/matters/{matter_id}/drafts", response_model=DraftRead, status_code=status.HTTP_202_ACCEPTED)
async def create_draft(
    matter_id: UUID,
    payload: DraftCreate,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    actor_id: UUID | None = Depends(get_actor_id),
) -> DraftRead:
    try:
        draft = draft_service.create_draft(
            session,
            tenant_id=tenant_id,
            actor_id=actor_id,
            matter_id=matter_id,
            payload=payload,
        )
    except ValueError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await enqueue_job("generate_draft", str(draft.id), str(tenant_id))
    return DraftRead.model_validate(draft)


@router.get("/v1/matters/{matter_id}/drafts", response_model=list[DraftRead])
def list_drafts(
    matter_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[DraftRead]:
    drafts = draft_service.list_drafts(session, tenant_id, matter_id)
    return [DraftRead.model_validate(draft) for draft in drafts]


@router.get("/v1/matters/{matter_id}/evidence", response_model=list[EvidenceItemRead])
def list_evidence(
    matter_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[EvidenceItemRead]:
    evidence_items = draft_service.list_evidence(session, tenant_id, matter_id)
    return [EvidenceItemRead.model_validate(item) for item in evidence_items]
