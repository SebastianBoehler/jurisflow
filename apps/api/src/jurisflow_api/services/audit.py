from uuid import UUID

from sqlalchemy.orm import Session

from jurisflow_db.models import AuditLogEntry


def log_action(
    session: Session,
    *,
    tenant_id: UUID,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | None,
    details: dict,
) -> None:
    session.add(
        AuditLogEntry(
            tenant_id=tenant_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )

