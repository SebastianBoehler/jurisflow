"""Thin LiteLLM wrapper for structured JSON output used by research stages."""
from __future__ import annotations

import json
import os
from typing import TypeVar

import litellm
from pydantic import BaseModel

from jurisflow_shared import get_settings

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class StructuredLLMError(RuntimeError):
    pass


def _resolve_model() -> tuple[str, bool]:
    """Return (litellm_model_name, is_configured)."""
    settings = get_settings()
    if not settings.enable_structured_llm:
        return "", False
    if settings.openrouter_api_key:
        os.environ.setdefault("OPENROUTER_API_KEY", settings.openrouter_api_key)
        return settings.openrouter_model, True
    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
        model = settings.openai_model
        if not model.startswith("openai/"):
            model = f"openai/{model}"
        return model, True
    return "", False


class StructuredLLMClient:
    """Provider-agnostic LLM client for structured JSON generation.

    Uses LiteLLM under the hood so the same code path works for OpenAI,
    OpenRouter, or any other provider LiteLLM supports.
    """

    def __init__(self) -> None:
        self._model, self._configured = _resolve_model()

    @property
    def is_configured(self) -> bool:
        return self._configured

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[SchemaT],
        temperature: float = 0.2,
    ) -> SchemaT:
        if not self._configured:
            raise StructuredLLMError("Kein LLM konfiguriert (OPENROUTER_API_KEY / OPENAI_API_KEY fehlt oder enable_structured_llm=false).")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Attempt 1: json_schema structured output
        try:
            response = litellm.completion(
                model=self._model,
                messages=messages,
                temperature=temperature,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": response_model.__name__,
                        "strict": True,
                        "schema": response_model.model_json_schema(),
                    },
                },
            )
            content = response.choices[0].message.content or ""
            return response_model.model_validate_json(content)
        except Exception:
            pass

        # Attempt 2: plain json_object mode (wider model support)
        try:
            fallback_messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"{user_prompt}\n\n"
                        "Antworte ausschliesslich mit gueltigem JSON ohne Markdown-Codeblock."
                    ),
                },
            ]
            response = litellm.completion(
                model=self._model,
                messages=fallback_messages,
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or ""
            json_str = _extract_json_object(content)
            return response_model.model_validate_json(json_str)
        except Exception as exc:
            raise StructuredLLMError(
                f"LLM-Antwort konnte nicht in {response_model.__name__} validiert werden: {str(exc)[:400]}"
            ) from exc


def _extract_json_object(text: str) -> str:
    decoder = json.JSONDecoder()
    for start_index, character in enumerate(text):
        if character != "{":
            continue
        try:
            _, end_index = decoder.raw_decode(text[start_index:])
            return text[start_index: start_index + end_index]
        except json.JSONDecodeError:
            continue
    raise StructuredLLMError("Konnte kein gueltiges JSON aus der Modellantwort extrahieren.")
