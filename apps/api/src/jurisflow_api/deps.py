from uuid import UUID

from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session

from jurisflow_db.session import get_session_factory
from jurisflow_shared import get_settings


def get_db_session():
    session_factory = get_session_factory()
    session: Session = session_factory()
    try:
        yield session
    finally:
        session.close()


def get_tenant_id(x_tenant_id: str | None = Header(default=None)) -> UUID:
    raw_value = x_tenant_id or get_settings().default_tenant_id
    try:
        return UUID(raw_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Tenant-ID header.",
        ) from exc


def get_actor_id(x_user_id: str | None = Header(default=None)) -> UUID | None:
    if not x_user_id:
        return None
    try:
        return UUID(x_user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-User-ID header.",
        ) from exc

