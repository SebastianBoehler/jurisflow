from urllib.parse import quote_plus

import httpx
from lxml import html

from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import ResearchSource


class EurLexProvider(ResearchProvider):
    search_url = "https://eur-lex.europa.eu/search.html"

    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        params = {"text": " ".join(part for part in [request.query, request.focus or ""] if part).strip()}
        try:
            response = httpx.get(
                self.search_url,
                params=params,
                headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "de-DE,de;q=0.9,en;q=0.8"},
                timeout=20.0,
                follow_redirects=True,
            )
            response.raise_for_status()
        except Exception:
            return []

        if not response.text.strip():
            return []
        document = html.fromstring(response.text)
        hits: list[RetrievalHit] = []
        for index, anchor in enumerate(document.xpath("//a[contains(@href, '/legal-content/')]")[: request.max_results], start=1):
            href = anchor.get("href")
            if not href:
                continue
            excerpt = ""
            parent = anchor.getparent()
            if parent is not None:
                excerpt = " ".join(parent.text_content().split())
            hits.append(
                RetrievalHit(
                    source=ResearchSource.EU_LAW,
                    title=" ".join(anchor.text_content().split()),
                    excerpt=excerpt[:700],
                    relevance_score=max(0.25, 0.68 - index * 0.04),
                    url=href,
                )
            )
        return hits

    def search_url_for_query(self, request: SearchRequest) -> str:
        text = quote_plus(" ".join(part for part in [request.query, request.focus or ""] if part))
        return f"{self.search_url}?text={text}"
