from urllib.parse import quote_plus, urljoin

import httpx
from lxml import html

from jurisflow_retrieval.citations import extract_celex_from_url
from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_retrieval.utils import clean_text
from jurisflow_shared import ResearchSource

# Human-readable labels for common CELEX document type codes
_CELEX_TYPE_LABELS: dict[str, str] = {
    "R": "Verordnung (EU)",
    "L": "Richtlinie (EU)",
    "D": "Beschluss (EU)",
    "C": "Mitteilung",
    "E": "Entscheidung",
}

# Well-known CELEX → common name mappings for the most frequently cited EU acts
_WELL_KNOWN: dict[str, str] = {
    "32016R0679": "DSGVO",
    "32016L0680": "JI-Richtlinie",
    "32018R1807": "Non-Personal-Data-VO",
    "32022R0868": "Data Governance Act",
    "32022R2065": "DSA",
    "32022R1925": "DMA",
    "32024R1689": "AI Act",
    "31995L0046": "Datenschutz-RL 95/46",
    "32006L0054": "Gleichbehandlungs-RL",
    "32003L0088": "Arbeitszeitrichtlinie",
    "31993L0013": "Klauselrichtlinie",
    "32011L0083": "Verbraucherrechte-RL",
    "32015L2302": "Pauschalreise-RL",
}


def _celex_citation(celex: str, title: str) -> str:
    """Return a human-readable citation string for a CELEX number."""
    nickname = _WELL_KNOWN.get(celex)
    if nickname:
        return f"CELEX:{celex} ({nickname})"
    # Derive type label from 5th char of CELEX (e.g. 32016R0679 → R → Verordnung)
    type_char = celex[4] if len(celex) > 4 else ""
    type_label = _CELEX_TYPE_LABELS.get(type_char, "EU-Rechtsakt")
    return f"CELEX:{celex} – {type_label}"


class EurLexProvider(ResearchProvider):
    search_url = "https://eur-lex.europa.eu/search.html"
    base_url = "https://eur-lex.europa.eu"

    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        params = {
            "text": " ".join(part for part in [request.query, request.focus or ""] if part).strip(),
            "scope": "EURLEX",
            "type": "quick",
            "lang": "de",
        }
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
        seen_urls: set[str] = set()

        for index, anchor in enumerate(
            document.xpath("//a[contains(@href, '/legal-content/')]")[: request.max_results * 2],
            start=1,
        ):
            href = anchor.get("href") or ""
            if not href:
                continue
            full_url = urljoin(self.base_url, href) if not href.startswith("http") else href
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            title = clean_text(anchor.text_content())
            if not title:
                continue

            # Try to derive excerpt from parent element
            parent = anchor.getparent()
            excerpt = clean_text(parent.text_content()) if parent is not None else ""

            # Extract CELEX and build a proper citation
            celex = extract_celex_from_url(full_url)
            if celex:
                citation = _celex_citation(celex, title)
            else:
                # Fall back to clean title as citation
                citation = title[:80] if title else None

            hits.append(
                RetrievalHit(
                    source=ResearchSource.EU_LAW,
                    title=title,
                    citation=citation,
                    excerpt=excerpt[:700],
                    relevance_score=max(0.25, 0.72 - len(hits) * 0.04),
                    url=full_url,
                )
            )
            if len(hits) >= request.max_results:
                break
        return hits

    def search_url_for_query(self, request: SearchRequest) -> str:
        text = quote_plus(" ".join(part for part in [request.query, request.focus or ""] if part))
        return f"{self.search_url}?text={text}&scope=EURLEX&lang=de"
