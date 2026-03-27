"""LlmAgent-based chat with optional web-search tool via Google ADK + LiteLLM."""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.genai.types import Content, Part

from jurisflow_retrieval.providers.general_web import GeneralWebSearchProvider
from jurisflow_retrieval.types import SearchRequest
from jurisflow_shared import get_settings

_SYSTEM_INSTRUCTION = (
    "Du bist ein juristischer KI-Assistent für deutsche Rechtsanwälte. "
    "Beantworte Fragen präzise und praxisnah auf Deutsch. "
    "Verweise auf einschlägige Normen (Paragraphen, Artikel) und Urteile, "
    "sofern sie für die Frage relevant sind. "
    "Nutze `web_search` wenn du aktuelle Rechtsinformationen oder konkrete "
    "Gesetzestexte benötigst — aber nicht für allgemeine Rechtsfragen, die du "
    "aus deinem Wissen beantworten kannst."
)


def web_search(query: str) -> str:
    """Search German legal sources on the web.

    Use this when you need current statutes, case law citations, or official
    regulatory text that you are not certain about.

    Args:
        query: Search query in German, ideally including relevant law names or §§.

    Returns:
        Formatted search results with title, URL and excerpt for each hit.
    """
    provider = GeneralWebSearchProvider()
    try:
        hits = provider.search(SearchRequest(query=query, max_results=5))
    except Exception as exc:
        return f"Suche fehlgeschlagen: {exc}"
    if not hits:
        return "Keine Treffer gefunden."
    parts = []
    for hit in hits:
        excerpt = (hit.excerpt or "")[:300].replace("\n", " ").strip()
        url_line = f"\n{hit.url}" if hit.url else ""
        parts.append(f"**{hit.title}**{url_line}\n{excerpt}")
    return "\n\n---\n\n".join(parts)


def _resolve_model() -> tuple[str, str | None]:
    """Return (litellm_model_name, api_key) for the configured provider."""
    settings = get_settings()
    if settings.openrouter_api_key:
        os.environ.setdefault("OPENROUTER_API_KEY", settings.openrouter_api_key)
        return settings.openrouter_model, settings.openrouter_api_key
    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
        # LiteLLM recognises gpt-* without prefix; add it to be explicit
        model = settings.openai_model
        if not model.startswith("openai/"):
            model = f"openai/{model}"
        return model, settings.openai_api_key
    return "", None


def _build_agent(history: list[dict]) -> LlmAgent:
    """Build a fresh LlmAgent, baking prior conversation into the instruction."""
    model_name, _ = _resolve_model()

    instruction = _SYSTEM_INSTRUCTION
    if history:
        lines = ["\n\n[Bisheriger Gesprächsverlauf]"]
        for turn in history:
            role_label = "Nutzer" if turn.get("role") == "user" else "Assistent"
            lines.append(f"{role_label}: {turn.get('content', '').strip()}")
        instruction += "\n".join(lines)

    return LlmAgent(
        name="JurisflowChatAgent",
        model=LiteLlm(model=model_name),
        instruction=instruction,
        tools=[FunctionTool(web_search)],
    )


async def run_chat(query: str, history: list[dict]) -> str:
    """Run the chat agent and return the final text response.

    Args:
        query: The current user query.
        history: Prior turns as [{role: "user"|"assistant", content: str}].

    Returns:
        The agent's text response, or a helpful error message.
    """
    _, api_key = _resolve_model()
    if not api_key:
        return (
            "Kein KI-Modell konfiguriert. "
            "Bitte `OPENROUTER_API_KEY` oder `OPENAI_API_KEY` in der .env setzen."
        )

    agent = _build_agent(history)
    session_service = InMemorySessionService()
    runner = Runner(
        agent=agent,
        app_name="jurisflow-chat",
        session_service=session_service,
    )

    session = await session_service.create_session(
        app_name="jurisflow-chat",
        user_id="ephemeral",
    )

    user_msg = Content(role="user", parts=[Part(text=query)])

    final_text = ""
    async for event in runner.run_async(
        user_id=session.user_id,
        session_id=session.id,
        new_message=user_msg,
    ):
        if event.is_final_response() and event.content:
            final_text = "".join(
                p.text or "" for p in (event.content.parts or []) if hasattr(p, "text")
            )

    return final_text or "Keine Antwort erhalten."
