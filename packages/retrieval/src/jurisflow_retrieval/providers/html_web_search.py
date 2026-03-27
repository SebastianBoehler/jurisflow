from urllib.parse import parse_qs, urlparse

import httpx
from lxml import html

from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_retrieval.utils import clean_text
from jurisflow_shared import ResearchSource

SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/"
BING_SEARCH_ENDPOINT = "https://www.bing.com/search"
DEFAULT_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Jurisflow/1.0)"}
GENERIC_STOPWORDS = {
    "als",
    "amtliche",
    "auch",
    "aus",
    "bei",
    "das",
    "dem",
    "den",
    "der",
    "des",
    "deutschland",
    "die",
    "eine",
    "einer",
    "entfernt",
    "frage",
    "fuer",
    "für",
    "gericht",
    "gilt",
    "im",
    "ist",
    "muss",
    "norm",
    "oder",
    "quelle",
    "sein",
    "sind",
    "steht",
    "stehen",
    "und",
    "vom",
    "von",
    "weit",
    "wie",
}


def run_html_web_search(
    *,
    source: ResearchSource,
    request: SearchRequest,
    query_suffix: str = "",
    preferred_domains: tuple[str, ...] = (),
) -> list[RetrievalHit]:
    query_candidates = _build_query_candidates(request=request, query_suffix=query_suffix)
    for query in query_candidates:
        hits = _search_query(
            source=source,
            query=query,
            max_results=request.max_results,
            preferred_domains=preferred_domains,
        )
        if hits:
            return hits
    return []


def _build_query_candidates(*, request: SearchRequest, query_suffix: str) -> list[str]:
    parts = [request.query, request.focus or "", query_suffix]
    full_query = " ".join(part for part in parts if part).strip()
    if not full_query:
        return []

    candidates = [full_query]
    compact_full = _compact_query(full_query, max_terms=8)
    compact_base = _compact_query(" ".join(part for part in [request.query, request.focus or ""] if part), max_terms=6)
    compact_suffix = _compact_query(query_suffix, max_terms=2)

    for candidate in (
        compact_full,
        " ".join(part for part in [compact_base, compact_suffix] if part).strip(),
        compact_base,
    ):
        if candidate and candidate not in candidates:
            candidates.append(candidate)
    return candidates


def _search_query(
    *,
    source: ResearchSource,
    query: str,
    max_results: int,
    preferred_domains: tuple[str, ...],
) -> list[RetrievalHit]:
    for engine in (_fetch_duckduckgo_document, _fetch_bing_document):
        try:
            document = engine(query)
        except httpx.HTTPError:
            continue
        hits = _extract_hits(
            document=document,
            query=query,
            source=source,
            max_results=max_results,
            preferred_domains=preferred_domains,
        )
        if hits:
            return hits
    return []


def _fetch_duckduckgo_document(query: str) -> html.HtmlElement:
    response = httpx.get(
        SEARCH_ENDPOINT,
        params={"q": query},
        headers=DEFAULT_HEADERS,
        timeout=20.0,
        follow_redirects=True,
    )
    response.raise_for_status()
    return html.fromstring(response.text)


def _fetch_bing_document(query: str) -> html.HtmlElement:
    response = httpx.get(
        BING_SEARCH_ENDPOINT,
        params={"q": query, "setlang": "de-DE"},
        headers=DEFAULT_HEADERS,
        timeout=20.0,
        follow_redirects=True,
    )
    response.raise_for_status()
    return html.fromstring(response.text)


def _extract_hits(
    *,
    document: html.HtmlElement,
    query: str,
    source: ResearchSource,
    max_results: int,
    preferred_domains: tuple[str, ...],
) -> list[RetrievalHit]:
    candidates: list[tuple[float, RetrievalHit]] = []
    seen: set[str] = set()
    query_terms = _compact_query(query, max_terms=6).split()
    min_overlap = 2 if len(query_terms) >= 3 else 1

    result_nodes = document.xpath("//a[contains(@class, 'result__a')]")
    extractor = _extract_duckduckgo_hit
    if not result_nodes:
        result_nodes = document.xpath("//li[contains(@class, 'b_algo')]")
        extractor = _extract_bing_hit

    for position, node in enumerate(result_nodes, start=1):
        extracted = extractor(node)
        if extracted is None:
            continue
        target_url, title, snippet = extracted
        if not target_url or not title or target_url in seen:
            continue
        if not _is_relevant_hit(title=title, snippet=snippet, url=target_url, query_terms=query_terms, min_overlap=min_overlap):
            continue
        seen.add(target_url)
        host = _host_label(target_url)
        bonus = _domain_bonus(host, preferred_domains)
        candidates.append(
            (
                bonus - position * 0.01,
                RetrievalHit(
                    source=source,
                    title=title,
                    citation=host,
                    excerpt=snippet[:700],
                    relevance_score=max(0.3, 0.86 - position * 0.05 + bonus),
                    url=target_url,
                ),
            )
        )

    candidates.sort(key=lambda item: (item[0], item[1].relevance_score), reverse=True)
    return [hit for _, hit in candidates[:max_results]]


def _is_relevant_hit(*, title: str, snippet: str, url: str, query_terms: list[str], min_overlap: int) -> bool:
    if not query_terms:
        return True
    haystack = " ".join([title, snippet, url]).lower()
    overlap = sum(1 for term in query_terms if term in haystack)
    return overlap >= min_overlap


def _extract_duckduckgo_hit(anchor: html.HtmlElement) -> tuple[str, str, str] | None:
    raw_href = anchor.get("href") or ""
    target_url = _resolve_target_url(raw_href)
    title = _clean_text(anchor.text_content())
    snippet_nodes = anchor.xpath("./ancestor::div[contains(@class,'result')][1]//*[contains(@class,'result__snippet')]//text()")
    snippet = _clean_text(" ".join(snippet_nodes))
    if not target_url or not title:
        return None
    return target_url, title, snippet


def _extract_bing_hit(node: html.HtmlElement) -> tuple[str, str, str] | None:
    anchor_nodes = node.xpath(".//h2/a")
    if not anchor_nodes:
        return None
    anchor = anchor_nodes[0]
    target_url = anchor.get("href") or ""
    title = _clean_text(anchor.text_content())
    snippet_nodes = node.xpath(".//div[contains(@class, 'b_caption')]//p//text()")
    snippet = _clean_text(" ".join(snippet_nodes))
    if not target_url or not title:
        return None
    return target_url, title, snippet


def _resolve_target_url(raw_href: str) -> str | None:
    if not raw_href:
        return None
    href = raw_href if raw_href.startswith("http") else f"https:{raw_href}" if raw_href.startswith("//") else raw_href
    parsed = urlparse(href)
    if "duckduckgo.com" not in parsed.netloc:
        return href
    query = parse_qs(parsed.query).get("uddg")
    if not query:
        return None
    return query[0]


def _host_label(url: str) -> str:
    return urlparse(url).netloc.replace("www.", "") or url


def _domain_bonus(host: str, preferred_domains: tuple[str, ...]) -> float:
    lowered = host.lower()
    if any(domain in lowered for domain in preferred_domains):
        return 0.24
    if any(token in lowered for token in ("gesetze", "landesrecht", "justiz", "gericht", "ministerium", "polizei", "bund")):
        return 0.14
    if lowered.endswith(".de"):
        return 0.04
    return 0.0


_clean_text = clean_text


def _compact_query(query: str, *, max_terms: int) -> str:
    terms: list[str] = []
    for raw_term in query.replace("?", " ").replace(",", " ").replace(".", " ").split():
        term = raw_term.strip(" ,.;:()[]{}").lower()
        if len(term) < 4 or term in GENERIC_STOPWORDS or term.isdigit():
            continue
        if term not in terms:
            terms.append(term)
        if len(terms) >= max_terms:
            break
    return " ".join(terms)
