import re
import time
from urllib.parse import urlparse

import httpx

from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import ResearchSource, get_settings

REQUEST_TIMEOUT = httpx.Timeout(35.0, connect=10.0, read=35.0, write=10.0, pool=10.0)
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
MAX_ATTEMPTS = 3


def run_openai_web_search(
    *,
    source: ResearchSource,
    request: SearchRequest,
    prompt: str,
    preferred_domains: tuple[str, ...] = (),
) -> list[RetrievalHit]:
    settings = get_settings()
    if not settings.openai_api_key or not settings.openai_model:
        return []

    payload = {
        "model": settings.openai_model,
        "input": prompt,
        "reasoning": {"effort": "low"},
        "tools": [{"type": "web_search"}],
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    try:
        response_payload = _request_with_retries(
            base_url=settings.openai_base_url,
            headers=headers,
            payload=payload,
        )
    except httpx.TimeoutException as exc:
        raise RuntimeError("Web-Recherche Zeitlimit erreicht.") from exc
    except httpx.HTTPError as exc:
        status_code = getattr(exc.response, "status_code", None)
        if status_code == 429:
            raise RuntimeError("Web-Recherche rate-limitiert. Bitte in wenigen Sekunden erneut versuchen.") from exc
        raise RuntimeError(f"Web-Recherche fehlgeschlagen: {str(exc)[:180]}") from exc

    hits = _parse_response(response_payload, max_results=request.max_results, preferred_domains=preferred_domains, source=source)
    if hits:
        return hits

    incomplete_reason = (response_payload.get("incomplete_details") or {}).get("reason")
    if incomplete_reason:
        raise RuntimeError(f"Web-Recherche unvollstaendig: {incomplete_reason}.")
    return []


def _request_with_retries(*, base_url: str, headers: dict[str, str], payload: dict) -> dict:
    last_error: Exception | None = None
    with httpx.Client(base_url=base_url, timeout=REQUEST_TIMEOUT) as client:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                response = client.post("/responses", headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
            except httpx.TimeoutException as exc:
                last_error = exc
                if attempt >= MAX_ATTEMPTS:
                    raise
            except httpx.HTTPStatusError as exc:
                last_error = exc
                if exc.response.status_code not in RETRYABLE_STATUS_CODES or attempt >= MAX_ATTEMPTS:
                    raise
            if attempt < MAX_ATTEMPTS:
                time.sleep(0.8 * attempt)
    if last_error:
        raise last_error
    return {}


def _parse_response(
    payload: dict,
    *,
    max_results: int,
    preferred_domains: tuple[str, ...],
    source: ResearchSource,
) -> list[RetrievalHit]:
    candidates: list[tuple[float, RetrievalHit]] = []
    seen_urls: set[str] = set()
    position = 0
    for item in payload.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") != "output_text":
                continue
            text = content.get("text", "")
            annotations = [annotation for annotation in content.get("annotations", []) if annotation.get("type") == "url_citation"]
            for annotation in annotations:
                url = annotation.get("url")
                title = annotation.get("title")
                if not url or not title or url in seen_urls:
                    continue
                seen_urls.add(url)
                position += 1
                host = _host_label(url)
                domain_bonus = _domain_bonus(host, preferred_domains)
                candidates.append(
                    (
                        domain_bonus - position * 0.01,
                        RetrievalHit(
                            source=source,
                            title=title,
                            citation=host,
                            excerpt=_extract_supporting_text(text, annotation).strip()[:700],
                            relevance_score=max(0.35, 0.88 - position * 0.06 + domain_bonus),
                            url=url,
                        ),
                    )
                )
    candidates.sort(key=lambda item: (item[0], item[1].relevance_score), reverse=True)
    return [hit for _, hit in candidates[:max_results]]


def _domain_bonus(host: str, preferred_domains: tuple[str, ...]) -> float:
    lowered = host.lower()
    if any(domain in lowered for domain in preferred_domains):
        return 0.25
    if any(token in lowered for token in ("gesetze", "landesrecht", "bund", "justiz", "gericht", "ministerium", "polizei")):
        return 0.16
    if lowered.endswith(".de"):
        return 0.05
    return 0.0


def _host_label(url: str) -> str:
    host = urlparse(url).netloc.replace("www.", "")
    return host or url


def _extract_supporting_text(text: str, annotation: dict) -> str:
    start_index = max(0, annotation.get("start_index", 0))
    end_index = max(start_index, annotation.get("end_index", start_index))
    line_start = text.rfind("\n", 0, start_index)
    line_end = text.find("\n", end_index)
    segment = text[(line_start + 1 if line_start >= 0 else 0) : (line_end if line_end >= 0 else len(text))]
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", segment)
    return " ".join(cleaned.split())
