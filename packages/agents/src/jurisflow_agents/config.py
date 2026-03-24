from jurisflow_shared import Settings, get_settings


def live_model_enabled(settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    return bool(settings.openrouter_api_key and settings.openrouter_model)


def model_name(settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    return settings.openrouter_model

