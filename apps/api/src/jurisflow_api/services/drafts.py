from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from jurisflow_api.services.audit import log_action
from jurisflow_db.models import Draft, EvidenceItem, Matter
from jurisflow_shared import DraftCreate


def create_draft(
    session: Session,
    *,
    tenant_id: UUID,
    actor_id: UUID | None,
    matter_id: UUID,
    payload: DraftCreate,
) -> Draft:
    matter = session.get(Matter, matter_id)
    if matter is None or matter.tenant_id != tenant_id:
        raise ValueError("Matter not found.")
    draft = Draft(
        tenant_id=tenant_id,
        matter_id=matter_id,
        kind=payload.kind.value,
        title=payload.title,
        status="queued",
        content="",
    )
    session.add(draft)
    session.flush()
    log_action(
        session,
        tenant_id=tenant_id,
        actor_id=actor_id,
        action="draft.requested",
        entity_type="draft",
        entity_id=draft.id,
        details={"kind": payload.kind.value, "title": payload.title},
    )
    session.commit()
    session.refresh(draft)
    return draft


def list_drafts(session: Session, tenant_id: UUID, matter_id: UUID) -> list[Draft]:
    stmt = (
        select(Draft)
        .where(Draft.tenant_id == tenant_id, Draft.matter_id == matter_id)
        .order_by(Draft.created_at.desc())
    )
    return list(session.scalars(stmt))


def list_evidence(session: Session, tenant_id: UUID, matter_id: UUID) -> list[EvidenceItem]:
    stmt = (
        select(EvidenceItem)
        .where(EvidenceItem.tenant_id == tenant_id, EvidenceItem.matter_id == matter_id)
        .order_by(EvidenceItem.position.asc())
    )
    return list(session.scalars(stmt))
