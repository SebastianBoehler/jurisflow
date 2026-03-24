from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from jurisflow_api.services.audit import log_action
from jurisflow_db.models import Matter, Tenant
from jurisflow_shared import MatterCreate


def ensure_tenant(session: Session, tenant_id: UUID) -> None:
    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        session.add(Tenant(id=tenant_id, name="Default Tenant"))
        session.flush()


def create_matter(session: Session, tenant_id: UUID, actor_id: UUID | None, payload: MatterCreate) -> Matter:
    ensure_tenant(session, tenant_id)
    matter = Matter(tenant_id=tenant_id, title=payload.title, description=payload.description)
    session.add(matter)
    session.flush()
    log_action(
        session,
        tenant_id=tenant_id,
        actor_id=actor_id,
        action="matter.created",
        entity_type="matter",
        entity_id=matter.id,
        details={"title": matter.title},
    )
    session.commit()
    session.refresh(matter)
    return matter


def list_matters(session: Session, tenant_id: UUID) -> list[Matter]:
    stmt = select(Matter).where(Matter.tenant_id == tenant_id).order_by(Matter.created_at.desc())
    return list(session.scalars(stmt))


def get_matter(session: Session, tenant_id: UUID, matter_id: UUID) -> Matter | None:
    stmt = select(Matter).where(Matter.id == matter_id, Matter.tenant_id == tenant_id)
    return session.scalar(stmt)

