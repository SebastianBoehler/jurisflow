from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from jurisflow_api.deps import get_db_session, get_tenant_id
from jurisflow_db.models import Deadline
from jurisflow_shared import DeadlineRead

router = APIRouter(tags=["deadlines"])


@router.get("/v1/matters/{matter_id}/deadlines", response_model=list[DeadlineRead])
def list_deadlines(
    matter_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[DeadlineRead]:
    stmt = select(Deadline).where(Deadline.tenant_id == tenant_id, Deadline.matter_id == matter_id)
    deadlines = list(session.scalars(stmt))
    return [DeadlineRead.model_validate(deadline) for deadline in deadlines]

