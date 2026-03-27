"""
dejure.org provider – cross-linked German legal database.

dejure.org is one of the most useful free German legal resources because it
cross-links every statute section with all court decisions that cited it, and
vice-versa.  A search for "§ 242 BGB" returns the statute text AND links to
hundreds of BGH/OLG/etc decisions that interpreted it.

Two retrieval strategies:

1. **Direct statute page** – when the query contains explicit statute references
   (e.g. "§ 242 BGB", "§ 123a StGB") we fetch
   ``https://dejure.org/gesetze/{LAW}/{SECTION}.html`` directly.  The page
   contains the statute text plus a list of citing court decisions that is not
   available anywhere else for free.

2. **Web search fallback** – for general queries without statute anchors we
   fall back to a site-scoped web search via DuckDuckGo/Bing.

Results are tagged as FEDERAL_LAW so they appear alongside the official
gesetze-im-internet.de results in the reranker.
"""

import httpx
from lxml import html

from jurisflow_retrieval.citations import extract_statute_references
from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.providers.html_web_search import run_html_web_search
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_retrieval.utils import clean_text, decode_bytes
from jurisflow_shared import ResearchSource

_DEJURE_BASE = "https://dejure.org"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Jurisflow/1.0)",
    "Accept-Language": "de-DE,de;q=0.9",
}


class DejureProvider(ResearchProvider):
    """Retrieve statute texts + citing-decision cross-references from dejure.org."""

    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        direct_hits = self._direct_statute_hits(request.query)
        seen_urls = {h.url for h in direct_hits}

        if len(direct_hits) < request.max_results:
            # Web search for remaining slots; filter any overlap with direct hits
            web_hits = run_html_web_search(
                source=ResearchSource.FEDERAL_LAW,
                request=request,
                query_suffix="Kommentar Norm Urteil Verwaltung",
                preferred_domains=("dejure.org",),
            )
            for hit in web_hits:
                if hit.url not in seen_urls:
                    direct_hits.append(hit)
                    seen_urls.add(hit.url or "")

        return direct_hits[: request.max_results]

    # ------------------------------------------------------------------
    # Direct statute page lookup
    # ------------------------------------------------------------------

    def _direct_statute_hits(self, query: str) -> list[RetrievalHit]:
        hits: list[RetrievalHit] = []
        refs = extract_statute_references(f"{query}")
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            for index, ref in enumerate(refs[: 3], start=1):
                section, law = _split_reference(ref)
                if not section or not law:
                    continue
                url = f"{_DEJURE_BASE}/gesetze/{law.upper()}/{section.lower()}.html"
                try:
                    resp = client.get(url, headers=_HEADERS)
                    resp.raise_for_status()
                except Exception:
                    continue
                title, excerpt = _parse_statute_page(decode_bytes(resp.content))
                if not title:
                    continue
                hits.append(
                    RetrievalHit(
                        source=ResearchSource.FEDERAL_LAW,
                        title=title,
                        citation=ref,
                        excerpt=excerpt[:700],
                        relevance_score=max(0.75, 0.94 - index * 0.06),
                        url=str(resp.url),
                    )
                )
        return hits


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _split_reference(reference: str) -> tuple[str | None, str | None]:
    """Split '§ 242 BGB' into ('242', 'BGB')."""
    parts = reference.replace("§", "").replace("§§", "").split()
    parts = [p.strip(".,;") for p in parts if p.strip(".,;")]
    if len(parts) < 2:
        return None, None
    # First non-empty token is the section number; last is the law abbreviation
    return parts[0], parts[-1]


def _parse_statute_page(markup: str) -> tuple[str, str]:
    """Extract title and excerpt from a dejure.org statute page."""
    doc = html.fromstring(markup)

    # Title: h2 inside #norm or first h2 on the page
    heading_nodes = doc.xpath("//div[@id='norm']//h2 | //h2[@class='titel']")
    if not heading_nodes:
        heading_nodes = doc.xpath("//h1 | //h2")
    title = clean_text(heading_nodes[0].text_content()) if heading_nodes else ""

    # Main norm text: paragraphs inside .absatz or .jurAbsatz divs
    absatz_nodes = doc.xpath("//div[contains(@class,'absatz')] | //div[contains(@class,'jurAbsatz')]")
    paragraphs = [clean_text(n.text_content()) for n in absatz_nodes[:3] if n.text_content().strip()]

    # Cross-reference summary: how many decisions cite this norm
    citing_nodes = doc.xpath("//a[contains(@href,'rechtsprechung') and contains(text(),'Entscheidung')]")
    cite_hint = ""
    if citing_nodes:
        cite_hint = f" | Zitiert in: {clean_text(citing_nodes[0].text_content())}"

    excerpt = " ".join(paragraphs) + cite_hint
    return title, excerpt.strip()
