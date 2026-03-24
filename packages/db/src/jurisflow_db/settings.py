from functools import lru_cache

from jurisflow_shared import Settings, get_settings as get_shared_settings


@lru_cache(maxsize=1)
def get_db_settings() -> Settings:
    return get_shared_settings()

