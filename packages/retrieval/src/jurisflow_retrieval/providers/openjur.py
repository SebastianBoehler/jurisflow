"""
openJur.de provider – free German case law database.

openJur publishes full-text decisions from all German court levels under an
open licence.  The site is publicly accessible without authentication and
contains decisions from the BGH, BVerfG, OLGs, LGs and many more courts,
making it a valuable complement to the official rechtsprechung-im-internet.de
portal (which only covers federal court decisions).

Search endpoint:  https://openjur.de/suche/?q=QUERY
"""

from urllib.parse import urljoin

import httpx
from lxml import html

from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_retrieval.utils import clean_text
from jurisflow_shared import ResearchSource


class OpenJurProvider(ResearchProvider):
    base_url = "https://openjur.de"
    search_path = "/suche/"

    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        query = " ".join(p for p in [request.query, request.focus or ""] if p).strip()
        if not query:
            return []
        try:
            response = httpx.get(
                urljoin(self.base_url, self.search_path),
                params={"q": query},
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; Jurisflow/1.0)",
                    "Accept-Language": "de-DE,de;q=0.9",
                },
                timeout=20.0,
                follow_redirects=True,
            )
            response.raise_for_status()
        except Exception:
            return []

        document = html.fromstring(response.text)
        hits: list[RetrievalHit] = []
        seen: set[str] = set()

        # openJur wraps each result in a <div class="result"> containing an <h3><a>
        for entry in document.xpath("//div[contains(@class,'result') or contains(@class,'searchResult')]"):
            if len(hits) >= request.max_results:
                break

            # Title / link
            anchor_nodes = entry.xpath(".//h3/a | .//h2/a | .//a[contains(@href,'/urteile/') or contains(@href,'/n/')]")
            if not anchor_nodes:
                continue
            anchor = anchor_nodes[0]
            href = anchor.get("href", "")
            if not href:
                continue
            full_url = urljoin(self.base_url, href) if not href.startswith("http") else href
            if full_url in seen:
                continue
            seen.add(full_url)

            title = clean_text(anchor.text_content())
            if not title:
                continue

            # Snippet / preview text
            snippet_nodes = entry.xpath(
                ".//p[not(ancestor::h3)] | .//div[contains(@class,'snippet') or contains(@class,'preview')]"
            )
            excerpt = clean_text(snippet_nodes[0].text_content()) if snippet_nodes else ""

            # Try to extract a formal citation from the title, e.g. "BGH, Urt. v. 12.03.2020 – I ZR 45/19"
            citation = _extract_openjur_citation(title)

            hits.append(
                RetrievalHit(
                    source=ResearchSource.CASE_LAW,
                    title=title,
                    citation=citation,
                    excerpt=excerpt[:700],
                    relevance_score=max(0.22, 0.75 - len(hits) * 0.05),
                    url=full_url,
                )
            )

        return hits


def _extract_openjur_citation(title: str) -> str | None:
    """Extract a court / case reference from the openJur result title.

    openJur titles typically look like:
      "BGH, Urteil vom 12.03.2020 – I ZR 45/19"
      "OLG München, Beschluss v. 05.11.2019 – 23 U 123/19"
    """
    import re

    # Pattern: CourtName, [Urt.|Beschl.] v. DD.MM.YYYY – AZ
    pattern = re.compile(
        r"(?P<court>(?:BGH|BVerfG|BAG|BFH|BSG|BVerwG|"
        r"OLG\s+\w+(?:\s+\w+)?|LG\s+\w+(?:\s+\w+)?|AG\s+\w+|"
        r"OVG|VGH|LSG|VG\s+\w+|FG\s+\w+|BPatG|[A-ZÄÖÜ][a-zäöü]+gericht\s+\w+))"
        r"[,\s]*"
        r"(?:Urteil|Beschluss|Urt\.|Beschl\.)?"
        r"[,\s]*"
        r"(?:vom|v\.)?\s*"
        r"(?P<date>\d{1,2}\.\d{1,2}\.\d{2,4})?"
        r"(?:\s*[-–]\s*(?P<az>[A-Z0-9 /]+))?",
        re.IGNORECASE,
    )
    m = pattern.search(title)
    if not m:
        return None
    parts = [m.group("court").strip()]
    if m.group("date"):
        parts.append(m.group("date"))
    if m.group("az"):
        parts.append(m.group("az").strip())
    return " – ".join(parts) if len(parts) > 1 else parts[0]
