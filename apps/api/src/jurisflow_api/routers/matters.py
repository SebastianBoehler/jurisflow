from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from jurisflow_api.deps import get_actor_id, get_db_session, get_tenant_id
from jurisflow_api.services import matters as matter_service
from jurisflow_api.services.sample_matter import create_or_get_sample_matter
from jurisflow_shared import MatterCreate, MatterRead

router = APIRouter(prefix="/v1/matters", tags=["matters"])


@router.post("", response_model=MatterRead, status_code=status.HTTP_201_CREATED)
def create_matter(
    payload: MatterCreate,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    actor_id: UUID | None = Depends(get_actor_id),
) -> MatterRead:
    matter = matter_service.create_matter(session, tenant_id, actor_id, payload)
    return MatterRead.model_validate(matter)


@router.get("", response_model=list[MatterRead])
def list_matters(
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[MatterRead]:
    matters = matter_service.list_matters(session, tenant_id)
    return [MatterRead.model_validate(matter) for matter in matters]


@router.post("/sample", response_model=MatterRead, status_code=status.HTTP_201_CREATED)
def create_sample_matter(
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    actor_id: UUID | None = Depends(get_actor_id),
) -> MatterRead:
    matter = create_or_get_sample_matter(session, tenant_id, actor_id)
    return MatterRead.model_validate(matter)


@router.get("/{matter_id}", response_model=MatterRead)
def get_matter(
    matter_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> MatterRead:
    matter = matter_service.get_matter(session, tenant_id, matter_id)
    if matter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found.")
    return MatterRead.model_validate(matter)
