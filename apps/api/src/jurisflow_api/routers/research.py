from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from jurisflow_api.deps import get_actor_id, get_db_session, get_tenant_id
from jurisflow_api.queue import enqueue_job
from jurisflow_api.services import research as research_service
from jurisflow_shared import ResearchRequest, ResearchResultRead, ResearchRunRead

router = APIRouter(tags=["research"])


@router.post("/v1/matters/{matter_id}/research", response_model=ResearchRunRead, status_code=status.HTTP_202_ACCEPTED)
async def start_research(
    matter_id: UUID,
    payload: ResearchRequest,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    actor_id: UUID | None = Depends(get_actor_id),
) -> ResearchRunRead:
    try:
        run = research_service.create_research_run(
            session,
            tenant_id=tenant_id,
            actor_id=actor_id,
            matter_id=matter_id,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await enqueue_job("run_research", str(run.id), str(tenant_id), payload.model_dump_json())
    return ResearchRunRead.model_validate(run)


@router.get("/v1/matters/{matter_id}/research", response_model=list[ResearchRunRead])
def list_research_runs(
    matter_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[ResearchRunRead]:
    runs = research_service.list_research_runs(session, tenant_id, matter_id)
    return [ResearchRunRead.model_validate(run) for run in runs]


@router.get("/v1/research/{research_run_id}/results", response_model=list[ResearchResultRead])
def list_research_results(
    research_run_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[ResearchResultRead]:
    try:
        results = research_service.list_research_results(session, tenant_id, research_run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [ResearchResultRead.model_validate(result) for result in results]
