from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from jurisflow_db.settings import get_db_settings


def get_engine():
    settings = get_db_settings()
    return create_engine(settings.database_url, future=True, pool_pre_ping=True)


def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)

