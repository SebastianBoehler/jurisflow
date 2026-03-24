from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from jurisflow_api.services.audit import log_action
from jurisflow_db.models import Matter, ResearchResult, ResearchRun
from jurisflow_shared import ResearchRequest


def create_research_run(
    session: Session,
    *,
    tenant_id: UUID,
    actor_id: UUID | None,
    matter_id: UUID,
    payload: ResearchRequest,
) -> ResearchRun:
    matter = session.get(Matter, matter_id)
    if matter is None or matter.tenant_id != tenant_id:
        raise ValueError("Matter not found.")
    run = ResearchRun(
        tenant_id=tenant_id,
        matter_id=matter_id,
        query=payload.query,
        focus=payload.focus,
        sources=[source.value for source in payload.sources],
        filters=payload.filters,
        max_results=payload.max_results,
        deep_research=payload.deep_research,
        status="queued",
    )
    session.add(run)
    session.flush()
    log_action(
        session,
        tenant_id=tenant_id,
        actor_id=actor_id,
        action="research.requested",
        entity_type="research_run",
        entity_id=run.id,
        details={
            "query": payload.query,
            "sources": [source.value for source in payload.sources],
            "max_results": payload.max_results,
            "deep_research": payload.deep_research,
        },
    )
    session.commit()
    session.refresh(run)
    return run


def list_research_runs(session: Session, tenant_id: UUID, matter_id: UUID) -> list[ResearchRun]:
    stmt = select(ResearchRun).where(ResearchRun.tenant_id == tenant_id, ResearchRun.matter_id == matter_id)
    return list(session.scalars(stmt))


def list_research_results(session: Session, tenant_id: UUID, research_run_id: UUID) -> list[ResearchResult]:
    run = session.get(ResearchRun, research_run_id)
    if run is None or run.tenant_id != tenant_id:
        raise ValueError("Research run not found.")
    stmt = select(ResearchResult).where(ResearchResult.research_run_id == research_run_id)
    return list(session.scalars(stmt))
