"""
Firecrawl provider – AI-powered web search and content extraction.

Firecrawl (firecrawl.dev) retrieves full Markdown-rendered page content
from any URL, including JavaScript-heavy sites.  This is valuable for
German legal databases that dynamically render content (e.g. NJW, beck-online,
specialised agency portals) where plain HTML scraping produces poor results.

The provider is **optional** and is only activated when FIRECRAWL_API_KEY is
set in the environment.  When active it supplements (does not replace) the
primary web search lane.

API reference: https://docs.firecrawl.dev/api-reference/endpoint/search
"""

from urllib.parse import urlparse

import httpx

from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_retrieval.utils import clean_text
from jurisflow_shared import ResearchSource

_FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v1/search"

# Domains to target with Firecrawl for German legal content
# (these are JS-heavy or otherwise tricky for plain-HTML scraping)
_PREFERRED_LEGAL_DOMAINS = [
    "site:nrwe.de",           # NRW state court decisions
    "site:dejure.org",        # Cross-linked German legal database
    "site:openjur.de",        # Free case law
    "site:rewis.io",          # Alternative free case law
    "site:buzer.de",          # Statute tracking with amendments
]


class FirecrawlProvider(ResearchProvider):
    """Retrieve and parse German legal content via the Firecrawl API."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        query = " ".join(p for p in [request.query, request.focus or ""] if p).strip()
        if not query:
            return []

        payload: dict = {
            "query": query,
            "limit": request.max_results,
            "lang": "de",
            "country": "de",
            "scrapeOptions": {
                "formats": ["markdown"],
                "onlyMainContent": True,
            },
        }

        try:
            response = httpx.post(
                _FIRECRAWL_SEARCH_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
            response.raise_for_status()
        except Exception:
            return []

        data = response.json()
        hits: list[RetrievalHit] = []

        for index, item in enumerate(data.get("data", [])[: request.max_results], start=1):
            url = item.get("url", "")
            metadata = item.get("metadata") or {}

            title = metadata.get("title") or item.get("title") or url
            title = clean_text(title)

            # Prefer the Markdown rendition as excerpt; fall back to description
            markdown = item.get("markdown", "") or ""
            description = metadata.get("description", "") or item.get("description", "")
            raw_excerpt = markdown if markdown else description
            excerpt = clean_text(raw_excerpt)[:700]

            host = urlparse(url).netloc.replace("www.", "") if url else "firecrawl"
            citation = _derive_citation(url, title)

            hits.append(
                RetrievalHit(
                    source=ResearchSource.GENERAL_WEB,
                    title=title,
                    citation=citation or host,
                    excerpt=excerpt,
                    relevance_score=max(0.28, 0.82 - index * 0.05),
                    url=url or None,
                )
            )

        return hits


def _derive_citation(url: str, title: str) -> str | None:
    """Try to derive a useful citation label from the URL or title."""
    from jurisflow_retrieval.citations import extract_legal_references

    refs = extract_legal_references(title)
    if refs:
        return refs[0]
    host = urlparse(url).netloc.replace("www.", "")
    return host or None
