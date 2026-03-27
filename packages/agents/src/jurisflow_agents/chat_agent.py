"""LlmAgent-based chat with legal tools via Google ADK + LiteLLM."""
from __future__ import annotations

import os
from typing import AsyncGenerator

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.genai.types import Content, Part

from jurisflow_agents.legal_tools import (
    fetch_norm_text,
    gutachten_gliederung,
    pruefe_normkollision,
)
from jurisflow_retrieval.providers.general_web import GeneralWebSearchProvider
from jurisflow_retrieval.types import SearchRequest
from jurisflow_shared import get_settings

_SYSTEM_INSTRUCTION = (
    "Du bist ein juristischer KI-Assistent für deutsche Rechtsanwälte. "
    "Beantworte Fragen präzise und praxisnah auf Deutsch. "
    "Verweise auf einschlägige Normen (Paragraphen, Artikel) und Urteile, "
    "sofern sie für die Frage relevant sind.\n\n"
    "Verfügbare Tools — setze sie gezielt ein:\n"
    "- `web_search`: Für aktuelle Rechtsinformationen, konkrete Urteile oder Gesetzestexte, "
    "die du nicht mit Sicherheit kennst. Nicht für allgemeine Rechtsfragen.\n"
    "- `fetch_norm_text`: Ruft den aktuellen Wortlaut eines § direkt von "
    "gesetze-im-internet.de ab — inklusive Geltungsstand und Querverweisen. "
    "Nutze es, wenn du den exakten Normtext oder Verweisnormen benötigst.\n"
    "- `gutachten_gliederung`: Gibt eine Gutachtenstil-Vorlage zurück "
    "(Obersatz → Definition → Subsumtion → Ergebnis). "
    "Nutze es, wenn der Nutzer eine strukturierte Rechtsprüfung oder ein Gutachten wünscht — "
    "fülle die zurückgegebene Vorlage dann vollständig mit deiner Analyse aus.\n"
    "- `pruefe_normkollision`: Gibt eine Kollisionsprüfungs-Vorlage (lex specialis, lex posterior, "
    "lex superior) zurück, wenn zwei Normen potenziell in Konflikt stehen — "
    "fülle sie mit deiner Analyse aus."
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
        model = settings.openai_model
        if not model.startswith("openai/"):
            model = f"openai/{model}"
        return model, settings.openai_api_key
    return "", None


def _build_agent(
    history: list[dict],
    matter_context: dict | None = None,
) -> LlmAgent:
    """Build a fresh LlmAgent, baking prior conversation and matter context into the instruction."""
    model_name, _ = _resolve_model()

    instruction = _SYSTEM_INSTRUCTION

    if matter_context:
        lines = ["\n\n[Mandatskontext]"]
        if matter_context.get("title"):
            lines.append(f"Mandat: {matter_context['title']}")
        if matter_context.get("description"):
            lines.append(f"Sachverhalt/Beschreibung: {matter_context['description']}")
        instruction += "\n".join(lines)

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
        tools=[
            FunctionTool(web_search),
            FunctionTool(fetch_norm_text),
            FunctionTool(gutachten_gliederung),
            FunctionTool(pruefe_normkollision),
        ],
    )


async def run_chat(
    query: str,
    history: list[dict],
    matter_context: dict | None = None,
) -> str:
    """Run the chat agent and return the final text response.

    Args:
        query: The current user query.
        history: Prior turns as [{role: "user"|"assistant", content: str}].
        matter_context: Optional matter metadata (title, description) to ground the agent.

    Returns:
        The agent's text response, or a helpful error message.
    """
    _, api_key = _resolve_model()
    if not api_key:
        return (
            "Kein KI-Modell konfiguriert. "
            "Bitte `OPENROUTER_API_KEY` oder `OPENAI_API_KEY` in der .env setzen."
        )

    agent = _build_agent(history, matter_context)
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


async def stream_chat(
    query: str,
    history: list[dict],
    matter_context: dict | None = None,
) -> AsyncGenerator[dict, None]:
    """Async generator yielding structured events from the ADK chat agent.

    Event shapes:
      {"type": "text_delta", "text": str}
      {"type": "tool_call", "id": str, "name": str, "args": dict}
      {"type": "tool_result", "id": str, "name": str, "output": str}
      {"type": "done"}
      {"type": "error", "message": str}

    Args:
        query: The current user query.
        history: Prior turns as [{role: "user"|"assistant", content: str}].
        matter_context: Optional matter metadata (title, description) to ground the agent.
    """
    _, api_key = _resolve_model()
    if not api_key:
        yield {"type": "text_delta", "text": "Kein KI-Modell konfiguriert. Bitte OPENROUTER_API_KEY setzen."}
        yield {"type": "done"}
        return

    agent = _build_agent(history, matter_context)
    session_service = InMemorySessionService()
    runner = Runner(agent=agent, app_name="jurisflow-chat", session_service=session_service)
    session = await session_service.create_session(app_name="jurisflow-chat", user_id="ephemeral")
    user_msg = Content(role="user", parts=[Part(text=query)])

    try:
        async for event in runner.run_async(
            user_id=session.user_id,
            session_id=session.id,
            new_message=user_msg,
        ):
            if not event.content or not event.content.parts:
                continue
            for part in event.content.parts:
                if part.text:
                    yield {"type": "text_delta", "text": part.text}
                elif part.function_call:
                    fc = part.function_call
                    call_id = getattr(fc, "id", None) or f"call_{fc.name}"
                    yield {
                        "type": "tool_call",
                        "id": call_id,
                        "name": fc.name,
                        "args": dict(fc.args or {}),
                    }
                elif part.function_response:
                    fr = part.function_response
                    resp = fr.response or {}
                    if isinstance(resp, dict):
                        output = resp.get("output") or resp.get("result") or str(resp)
                    else:
                        output = str(resp)
                    result_id = getattr(fr, "id", None) or f"call_{fr.name}"
                    yield {
                        "type": "tool_result",
                        "id": result_id,
                        "name": fr.name,
                        "output": str(output)[:2000],
                    }
    except Exception as exc:
        yield {"type": "error", "message": str(exc)[:300]}
    finally:
        yield {"type": "done"}
