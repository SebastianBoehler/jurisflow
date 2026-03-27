from urllib.parse import urljoin

import httpx
from lxml import html

from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_retrieval.utils import clean_text
from jurisflow_shared import ResearchSource


class CaseLawProvider(ResearchProvider):
    base_url = "https://www.rechtsprechung-im-internet.de/jportal/portal/t/1niz/"
    search_path = "page/bsjrsprod.psml/js_peid/Suchportlet1/media-type/html"

    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        params = {
            "formhaschangedvalue": "yes",
            "eventSubmit_doSearch": "suchen",
            "action": "portlets.jw.MainAction",
            "deletemask": "no",
            "wt_form": "1",
            "form": "bsjrsFastSearch",
            "desc": "all",
            "query": " ".join(part for part in [request.query, request.focus or ""] if part).strip(),
            "standardsuche": "suchen",
        }
        try:
            response = httpx.get(
                urljoin(self.base_url, self.search_path),
                params=params,
                timeout=20.0,
                follow_redirects=True,
            )
            response.raise_for_status()
        except Exception:
            return []

        document = html.fromstring(response.text)
        hits: list[RetrievalHit] = []
        for anchor in document.xpath("//a[contains(@href, 'showdoccase=1')]"):
            href = anchor.get("href")
            if not href:
                continue
            title = _clean_text(anchor.text_content())
            if not title or title in {"Kurztext", "Langtext", "Leitsatz", "Orientierungssatz"}:
                continue
            container = anchor.getparent()
            while container is not None and "docPreview" not in html.tostring(container, encoding="unicode"):
                container = container.getparent()
            preview = ""
            if container is not None:
                preview_nodes = container.xpath(".//span[contains(@class, 'docPreview')]")
                if preview_nodes:
                    preview = _clean_text(preview_nodes[0].text_content())
            hits.append(
                RetrievalHit(
                    source=ResearchSource.CASE_LAW,
                    title=title,
                    citation=_extract_case_citation(title),
                    excerpt=preview[:700],
                    relevance_score=max(0.28, 0.8 - len(hits) * 0.04),
                    url=urljoin(self.base_url, href),
                )
            )
            if len(hits) >= request.max_results:
                break
        return hits


def _extract_case_citation(title: str) -> str | None:
    if "|" not in title:
        return None
    parts = [part.strip() for part in title.split("|") if part.strip()]
    if len(parts) < 2:
        return None
    return f"{parts[0]} | {parts[1]}"


_clean_text = clean_text
