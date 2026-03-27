import json
from typing import TypeVar

import httpx
from pydantic import BaseModel

from jurisflow_shared import get_settings

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class StructuredLLMError(RuntimeError):
    pass


class OpenRouterError(StructuredLLMError):
    pass


class OpenAIError(StructuredLLMError):
    pass


class _BaseStructuredLLMClient:
    provider_name = "unknown"
    settings_error = "No API key configured."

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def is_configured(self) -> bool:
        raise NotImplementedError

    @property
    def model_name(self) -> str:
        raise NotImplementedError

    @property
    def base_url(self) -> str:
        raise NotImplementedError

    def build_headers(self) -> dict[str, str]:
        raise NotImplementedError

    def build_payload(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[SchemaT],
        temperature: float,
    ) -> dict:
        return {
            "model": self.model_name,
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

    def build_fallback_payload(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> dict:
        return {
            "model": self.model_name,
            "temperature": 0.1,
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

    def build_repair_payload(
        self,
        *,
        response_model: type[SchemaT],
        invalid_json: str,
        validation_error: Exception,
    ) -> dict:
        return {
            "model": self.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Repariere JSON so, dass es exakt zum angeforderten Schema passt. "
                        "Verwende nur gueltiges JSON ohne Markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Zielmodell: {response_model.__name__}\n\n"
                        f"Schema:\n{json.dumps(response_model.model_json_schema(), ensure_ascii=True)}\n\n"
                        f"Validierungsfehler:\n{str(validation_error)}\n\n"
                        f"Zu reparierendes JSON:\n{invalid_json}"
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
        }

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[SchemaT],
        temperature: float = 0.2,
    ) -> SchemaT:
        if not self.is_configured:
            raise StructuredLLMError(self.settings_error)

        content = self._post(
            self.build_payload(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=response_model,
                temperature=temperature,
            )
        )
        try:
            return response_model.model_validate_json(content)
        except Exception:
            fallback_content = self._post(
                self.build_fallback_payload(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
            )
            fallback_json = _extract_json_object(fallback_content)
            try:
                return response_model.model_validate_json(fallback_json)
            except Exception as validation_error:
                repaired_content = self._post(
                    self.build_repair_payload(
                        response_model=response_model,
                        invalid_json=fallback_json,
                        validation_error=validation_error,
                    )
                )
                try:
                    return response_model.model_validate_json(_extract_json_object(repaired_content))
                except Exception as repair_error:
                    raise StructuredLLMError(
                        f"{self.provider_name}-Antwort konnte nicht in {response_model.__name__} validiert werden: {str(repair_error)[:500]}"
                    ) from repair_error

    def _post(self, payload: dict) -> str:
        try:
            with httpx.Client(base_url=self.base_url, timeout=90.0) as client:
                response = client.post("/chat/completions", headers=self.build_headers(), json=payload)
                if response.status_code >= 400:
                    raise StructuredLLMError(
                        f"{self.provider_name}-Fehler {response.status_code}: {response.text[:500]}"
                    )
                response_payload = response.json()
        except httpx.HTTPError as exc:
            raise StructuredLLMError(f"{self.provider_name}-Request fehlgeschlagen: {str(exc)[:500]}") from exc
        content = response_payload["choices"][0]["message"]["content"]
        if isinstance(content, list):
            parts = [part.get("text", "") for part in content if isinstance(part, dict)]
            return "\n".join(part for part in parts if part)
        if not isinstance(content, str):
            raise StructuredLLMError(f"{self.provider_name} lieferte kein Text-Content.")
        return content


class OpenAIClient(_BaseStructuredLLMClient):
    provider_name = "OpenAI"
    settings_error = "OPENAI_API_KEY ist nicht gesetzt."

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.enable_structured_llm and self.settings.openai_api_key and self.settings.openai_model)

    @property
    def model_name(self) -> str:
        return self.settings.openai_model

    @property
    def base_url(self) -> str:
        return self.settings.openai_base_url

    def build_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }

    def build_payload(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[SchemaT],
        temperature: float,
    ) -> dict:
        schema_json = json.dumps(response_model.model_json_schema(), ensure_ascii=True)
        return {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"{user_prompt}\n\n"
                        f"Antworte mit JSON, das exakt zum Schema von {response_model.__name__} passt. "
                        "Verwende die exakten Feldnamen aus dem Schema. "
                        "Keine Markdown-Codebloecke.\n\n"
                        f"JSON-Schema:\n{schema_json}"
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
        }

    def build_fallback_payload(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> dict:
        payload = super().build_fallback_payload(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )
        payload.pop("temperature", None)
        return payload

    def build_repair_payload(
        self,
        *,
        response_model: type[SchemaT],
        invalid_json: str,
        validation_error: Exception,
    ) -> dict:
        payload = super().build_repair_payload(
            response_model=response_model,
            invalid_json=invalid_json,
            validation_error=validation_error,
        )
        return payload


class OpenRouterClient(_BaseStructuredLLMClient):
    provider_name = "OpenRouter"
    settings_error = "OPENROUTER_API_KEY ist nicht gesetzt."

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.enable_structured_llm and self.settings.openrouter_api_key and self.settings.openrouter_model)

    @property
    def model_name(self) -> str:
        return self.settings.openrouter_model

    @property
    def base_url(self) -> str:
        return self.settings.openrouter_base_url

    def build_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.settings.openrouter_site_url,
            "X-Title": self.settings.openrouter_app_name,
        }


class StructuredLLMClient:
    def __init__(self) -> None:
        self.openai = OpenAIClient()
        self.openrouter = OpenRouterClient()
        self.client = self._resolve_client()

    @property
    def is_configured(self) -> bool:
        return self.client is not None

    @property
    def provider_name(self) -> str:
        if self.client is None:
            return "unconfigured"
        return self.client.provider_name.lower()

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[SchemaT],
        temperature: float = 0.2,
    ) -> SchemaT:
        if self.client is None:
            raise StructuredLLMError("Es ist weder OpenAI noch OpenRouter konfiguriert.")
        return self.client.generate_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=response_model,
            temperature=temperature,
        )

    def _resolve_client(self) -> _BaseStructuredLLMClient | None:
        if self.openai.is_configured:
            return self.openai
        if self.openrouter.is_configured:
            return self.openrouter
        return None


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
    raise StructuredLLMError("Konnte kein gueltiges JSON aus der Modellantwort extrahieren.")
