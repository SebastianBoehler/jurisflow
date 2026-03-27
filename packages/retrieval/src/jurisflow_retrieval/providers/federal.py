from urllib.parse import quote_plus

import httpx
from lxml import html

from jurisflow_retrieval.citations import extract_statute_references
from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_retrieval.utils import clean_text, decode_bytes
from jurisflow_shared import ResearchSource


class FederalLawProvider(ResearchProvider):
    search_url = "https://www.gesetze-im-internet.de/cgi-bin/htsearch"
    statute_base_url = "https://www.gesetze-im-internet.de"

    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        direct_hits = self._fetch_direct_statutes(request.query)
        search_hits = self._fetch_fulltext_hits(request)
        deduped: list[RetrievalHit] = []
        seen: set[tuple[str | None, str, str | None]] = set()
        for hit in [*direct_hits, *search_hits]:
            key = (hit.url, hit.title, hit.citation)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(hit)
        return deduped[: request.max_results]

    def _fetch_direct_statutes(self, query: str) -> list[RetrievalHit]:
        hits: list[RetrievalHit] = []
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            for index, reference in enumerate(extract_statute_references(query), start=1):
                section, law = _split_reference(reference)
                if not section or not law:
                    continue
                url = f"{self.statute_base_url}/{law.lower()}/__{section.lower()}.html"
                try:
                    response = client.get(url)
                    response.raise_for_status()
                except Exception:
                    continue
                title, excerpt = _parse_statute_page(decode_bytes(response.content))
                if not title or not excerpt:
                    continue
                hits.append(
                    RetrievalHit(
                        source=ResearchSource.FEDERAL_LAW,
                        title=title,
                        citation=reference,
                        excerpt=excerpt,
                        relevance_score=max(0.72, 0.98 - index * 0.06),
                        url=str(response.url),
                    )
                )
        return hits

    def _fetch_fulltext_hits(self, request: SearchRequest) -> list[RetrievalHit]:
        params = {
            "config": "Gesamt_bmjhome2005",
            "method": "and",
            "words": " ".join(part for part in [request.query, request.focus or ""] if part).strip(),
        }
        try:
            response = httpx.get(self.search_url, params=params, timeout=20.0, follow_redirects=True)
            response.raise_for_status()
        except Exception:
            return []

        document = html.fromstring(decode_bytes(response.content))
        results: list[RetrievalHit] = []
        for index, anchor in enumerate(document.xpath("//dl/dt/strong/a")[: request.max_results], start=1):
            href = anchor.get("href")
            if not href:
                continue
            description_nodes = anchor.xpath("./ancestor::dt/following-sibling::dd[1]")
            excerpt = ""
            if description_nodes:
                excerpt = _clean_text(description_nodes[0].text_content())
            title = _clean_text(anchor.text_content())
            citation = _extract_citation_from_title(title)
            results.append(
                RetrievalHit(
                    source=ResearchSource.FEDERAL_LAW,
                    title=title,
                    citation=citation,
                    excerpt=excerpt[:700],
                    relevance_score=max(0.3, 0.82 - index * 0.04),
                    url=href,
                )
            )
        return results

    def search_url_for_query(self, request: SearchRequest) -> str:
        terms = quote_plus(" ".join(part for part in [request.query, request.focus or ""] if part))
        return f"{self.search_url}?config=Gesamt_bmjhome2005&method=and&words={terms}"


def _split_reference(reference: str) -> tuple[str | None, str | None]:
    parts = reference.replace("§", "").split()
    if len(parts) < 2:
        return None, None
    return parts[0], parts[-1]


def _parse_statute_page(markup: str) -> tuple[str, str]:
    document = html.fromstring(markup)
    heading = " ".join(part.strip() for part in document.xpath("//h1//text()") if part.strip())
    paragraphs = [_clean_text(node.text_content()) for node in document.xpath("//div[contains(@class, 'jurAbsatz')]")]
    return _clean_text(heading), " ".join(paragraphs[:2]).strip()


def _extract_citation_from_title(title: str) -> str | None:
    if " - " not in title:
        return None
    citation, _ = title.split(" - ", 1)
    return citation.strip()


_clean_text = clean_text
