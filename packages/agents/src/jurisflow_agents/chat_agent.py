"""Chat agent using LiteLLM directly for true token-level streaming.

Google ADK's runner.run_async() only emits a single event once the LLM call
completes — no token deltas.  We use litellm.acompletion(stream=True) instead
and implement a thin manual tool-dispatch loop.  This gives real streaming
while keeping all four legal tools available.
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import AsyncGenerator

import litellm

from jurisflow_agents.legal_tools import (
    fetch_norm_text,
    gutachten_gliederung,
    pruefe_normkollision,
)
from jurisflow_retrieval.providers.general_web import GeneralWebSearchProvider
from jurisflow_retrieval.types import SearchRequest
from jurisflow_shared import get_settings

# ── System prompt ─────────────────────────────────────────────────────────────

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

# ── Tool functions ─────────────────────────────────────────────────────────────

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


# ── Tool registry & LiteLLM spec ──────────────────────────────────────────────

_TOOL_REGISTRY: dict[str, object] = {
    "web_search": web_search,
    "fetch_norm_text": fetch_norm_text,
    "gutachten_gliederung": gutachten_gliederung,
    "pruefe_normkollision": pruefe_normkollision,
}

_TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Sucht in deutschen Rechtsquellen im Web nach aktuellen Gesetzen, "
                "Urteilen und Normen. Nutze es für Informationen, die du nicht sicher kennst."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Suchanfrage auf Deutsch, idealerweise mit Gesetzesnamen oder §§.",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_norm_text",
            "description": (
                "Ruft den aktuellen Wortlaut eines Paragraphen von gesetze-im-internet.de ab, "
                "inklusive Geltungsstand und Querverweisen auf andere §§."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "paragraph": {
                        "type": "string",
                        "description": "Paragraphennummer ohne §-Zeichen, z.B. '242', '823', '433a'.",
                    },
                    "gesetz": {
                        "type": "string",
                        "description": "Gesetzeskürzel in Kleinbuchstaben, z.B. 'bgb', 'stgb', 'hgb', 'gg', 'ao'.",
                    },
                },
                "required": ["paragraph", "gesetz"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "gutachten_gliederung",
            "description": (
                "Erstellt eine Gutachtenstil-Vorlage (Obersatz → Definition → Subsumtion → Ergebnis). "
                "Nutze es, wenn der Nutzer eine strukturierte Rechtsprüfung wünscht — "
                "fülle die Vorlage anschließend mit deiner Analyse aus."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "obersatz": {
                        "type": "string",
                        "description": "Die zu prüfende Rechtsfrage als Obersatz.",
                    },
                    "norm_zitat": {
                        "type": "string",
                        "description": "Die einschlägige Norm, z.B. '§ 823 Abs. 1 BGB'.",
                    },
                },
                "required": ["obersatz", "norm_zitat"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "pruefe_normkollision",
            "description": (
                "Gibt eine Kollisionsprüfungs-Vorlage für zwei möglicherweise konfligierende Normen "
                "zurück (lex specialis, lex posterior, lex superior). "
                "Fülle sie mit deiner Analyse aus."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "norm1_zitat": {
                        "type": "string",
                        "description": "Erste Norm, z.B. '§ 823 BGB'.",
                    },
                    "norm2_zitat": {
                        "type": "string",
                        "description": "Zweite Norm, z.B. '§ 1 ProdHaftG'.",
                    },
                },
                "required": ["norm1_zitat", "norm2_zitat"],
            },
        },
    },
]


def _call_tool(name: str, args_json: str) -> str:
    """Synchronously dispatch a registered tool call."""
    try:
        args: dict = json.loads(args_json) if args_json.strip() else {}
    except json.JSONDecodeError:
        args = {}
    fn = _TOOL_REGISTRY.get(name)
    if fn is None:
        return f"Unbekanntes Tool: {name}"
    try:
        return str(fn(**args))  # type: ignore[operator]
    except Exception as exc:
        return f"Tool-Fehler ({name}): {exc}"


# ── Config helpers ────────────────────────────────────────────────────────────

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


def _build_system(matter_context: dict | None) -> str:
    instruction = _SYSTEM_INSTRUCTION
    if matter_context:
        lines = ["\n\n[Mandatskontext]"]
        if matter_context.get("title"):
            lines.append(f"Mandat: {matter_context['title']}")
        if matter_context.get("description"):
            lines.append(f"Sachverhalt/Beschreibung: {matter_context['description']}")
        instruction += "\n".join(lines)
    return instruction


def _build_messages(
    query: str,
    history: list[dict],
    matter_context: dict | None,
) -> list[dict]:
    msgs: list[dict] = [{"role": "system", "content": _build_system(matter_context)}]
    for turn in history:
        msgs.append({"role": turn["role"], "content": turn["content"]})
    msgs.append({"role": "user", "content": query})
    return msgs


# ── Public API ────────────────────────────────────────────────────────────────

async def run_chat(
    query: str,
    history: list[dict],
    matter_context: dict | None = None,
) -> str:
    """Run the chat agent and return the final text response.

    Args:
        query: The current user query.
        history: Prior turns as [{role: "user"|"assistant", content: str}].
        matter_context: Optional matter metadata (title, description).

    Returns:
        The agent's text response, or a helpful error message.
    """
    model_name, api_key = _resolve_model()
    if not api_key:
        return (
            "Kein KI-Modell konfiguriert. "
            "Bitte `OPENROUTER_API_KEY` oder `OPENAI_API_KEY` in der .env setzen."
        )

    messages = _build_messages(query, history, matter_context)
    loop = asyncio.get_running_loop()

    while True:
        response = await litellm.acompletion(
            model=model_name,
            messages=messages,
            tools=_TOOLS,
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            return msg.content or "Keine Antwort erhalten."

        # Append assistant turn with tool call requests
        messages.append({
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        })

        # Execute tools and append results
        for tc in msg.tool_calls:
            result = await loop.run_in_executor(
                None, _call_tool, tc.function.name, tc.function.arguments
            )
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })


async def stream_chat(
    query: str,
    history: list[dict],
    matter_context: dict | None = None,
) -> AsyncGenerator[dict, None]:
    """Async generator yielding structured events with true token-level streaming.

    Uses litellm.acompletion(stream=True) directly so each token is forwarded
    to the client as it arrives, instead of waiting for the full LLM response.

    Event shapes:
      {"type": "text_delta",  "text": str}
      {"type": "tool_call",   "id": str, "name": str, "args": dict}
      {"type": "tool_result", "id": str, "name": str, "output": str}
      {"type": "done"}
      {"type": "error",       "message": str}

    Args:
        query: The current user query.
        history: Prior turns as [{role: "user"|"assistant", content: str}].
        matter_context: Optional matter metadata (title, description).
    """
    model_name, api_key = _resolve_model()
    if not api_key:
        yield {"type": "text_delta", "text": "Kein KI-Modell konfiguriert. Bitte OPENROUTER_API_KEY setzen."}
        yield {"type": "done"}
        return

    messages = _build_messages(query, history, matter_context)
    loop = asyncio.get_running_loop()

    try:
        while True:
            response = await litellm.acompletion(
                model=model_name,
                messages=messages,
                tools=_TOOLS,
                stream=True,
            )

            # ── Consume the stream ────────────────────────────────────────
            acc_text = ""
            tool_calls_by_idx: dict[int, dict] = {}

            async for chunk in response:
                choice = chunk.choices[0]
                delta = choice.delta

                # Token delta
                if delta.content:
                    acc_text += delta.content
                    yield {"type": "text_delta", "text": delta.content}

                # Tool call delta (accumulate across chunks)
                if delta.tool_calls:
                    for tc_delta in delta.tool_calls:
                        idx = tc_delta.index
                        if idx not in tool_calls_by_idx:
                            tool_calls_by_idx[idx] = {
                                "id": tc_delta.id or f"call_{idx}",
                                "name": (tc_delta.function.name or "") if tc_delta.function else "",
                                "args": "",
                            }
                        if tc_delta.id:
                            tool_calls_by_idx[idx]["id"] = tc_delta.id
                        if tc_delta.function:
                            if tc_delta.function.name:
                                tool_calls_by_idx[idx]["name"] = tc_delta.function.name
                            if tc_delta.function.arguments:
                                tool_calls_by_idx[idx]["args"] += tc_delta.function.arguments

            # ── No tool calls → pure text response, we're done ────────────
            if not tool_calls_by_idx:
                break

            # ── Append assistant turn with tool call intents ──────────────
            messages.append({
                "role": "assistant",
                "content": acc_text or None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["name"], "arguments": tc["args"]},
                    }
                    for tc in tool_calls_by_idx.values()
                ],
            })

            # ── Execute tools ─────────────────────────────────────────────
            for tc in tool_calls_by_idx.values():
                try:
                    args_parsed: dict = json.loads(tc["args"]) if tc["args"].strip() else {}
                except json.JSONDecodeError:
                    args_parsed = {}

                yield {"type": "tool_call", "id": tc["id"], "name": tc["name"], "args": args_parsed}

                # Tools are sync — off-load to thread pool so we don't block the event loop
                result = await loop.run_in_executor(None, _call_tool, tc["name"], tc["args"])

                yield {"type": "tool_result", "id": tc["id"], "name": tc["name"], "output": str(result)[:2000]}

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": str(result),
                })

            # Loop: the model will now see the tool results and continue generating

    except Exception as exc:
        yield {"type": "error", "message": str(exc)[:300]}
    finally:
        yield {"type": "done"}
