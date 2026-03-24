import json
from typing import TypeVar

import httpx
from pydantic import BaseModel

from jurisflow_shared import get_settings

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class OpenRouterError(RuntimeError):
    pass


class OpenRouterClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.openrouter_api_key and self.settings.openrouter_model)

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[SchemaT],
        temperature: float = 0.2,
    ) -> SchemaT:
        if not self.is_configured:
            raise OpenRouterError("OPENROUTER_API_KEY ist nicht gesetzt.")

        payload = {
            "model": self.settings.openrouter_model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__,
                    "strict": True,
                    "schema": response_model.model_json_schema(),
                },
            },
        }
        content = self._post(payload)
        try:
            return response_model.model_validate_json(content)
        except Exception:
            fallback_payload = {
                "model": self.settings.openrouter_model,
                "temperature": temperature,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            f"{user_prompt}\n\n"
                            "Antworte ausschliesslich mit gueltigem JSON ohne Markdown-Codeblock."
                        ),
                    },
                ],
                "response_format": {"type": "json_object"},
            }
            fallback_content = self._post(fallback_payload)
            return response_model.model_validate_json(_extract_json_object(fallback_content))

    def _post(self, payload: dict) -> str:
        headers = {
            "Authorization": f"Bearer {self.settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.settings.openrouter_site_url,
            "X-Title": self.settings.openrouter_app_name,
        }
        with httpx.Client(base_url=self.settings.openrouter_base_url, timeout=45.0) as client:
            response = client.post("/chat/completions", headers=headers, json=payload)
            if response.status_code >= 400:
                raise OpenRouterError(f"OpenRouter-Fehler {response.status_code}: {response.text[:500]}")
            payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        if isinstance(content, list):
            parts = [part.get("text", "") for part in content if isinstance(part, dict)]
            return "\n".join(part for part in parts if part)
        if not isinstance(content, str):
            raise OpenRouterError("OpenRouter lieferte kein Text-Content.")
        return content


def _extract_json_object(text: str) -> str:
    decoder = json.JSONDecoder()
    for start_index, character in enumerate(text):
        if character != "{":
            continue
        try:
            _, end_index = decoder.raw_decode(text[start_index:])
            return text[start_index : start_index + end_index]
        except json.JSONDecodeError:
            continue
    raise OpenRouterError("Konnte kein gueltiges JSON aus der Modellantwort extrahieren.")
