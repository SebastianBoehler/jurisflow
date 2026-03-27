from jurisflow_retrieval import extract_statute_references
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import ResearchSource


PRACTICAL_TOPIC_TERMS = {
    "abstand",
    "abschleppen",
    "blitzer",
    "bussgeld",
    "bußgeld",
    "ortsschild",
    "parken",
    "polizei",
    "verwaltungsanweisung",
    "verwaltungsrichtlinie",
    "vorgabe",
}

EXPLICIT_LEGAL_ANCHORS = {
    "bgh",
    "olg",
    "vgh",
    "ovg",
    "eu-gh",
    "eur-lex",
    "richtlinie",
    "verordnung",
    "stvo",
    "vwv",
    "bkatv",
}
INFERABLE_STATUTE_PATTERNS = (
    ("fristlose kündigung", "zahlungsverzug"),
    ("fristlose kündigung",),
)


def should_run_reconnaissance(query: str, focus: str | None, requested_sources: list[ResearchSource]) -> bool:
    text = f"{query} {focus or ''}".lower().strip()
    if extract_statute_references(text):
        return False
    if any(anchor in text for anchor in EXPLICIT_LEGAL_ANCHORS):
        return False
    if any(all(fragment in text for fragment in pattern) for pattern in INFERABLE_STATUTE_PATTERNS):
        return False
    if ResearchSource.GENERAL_WEB in requested_sources:
        return True
    tokens = {token for token in text.replace("-", " ").split() if token}
    if any(term in tokens for term in PRACTICAL_TOPIC_TERMS):
        return True
    return len(tokens) <= 12


def build_reconnaissance_request(query: str, focus: str | None, max_results: int) -> SearchRequest:
    return SearchRequest(
        query=query,
        focus=focus,
        max_results=max(3, min(5, max_results)),
    )


def summarize_reconnaissance_hits(hits: list[RetrievalHit]) -> str:
    if not hits:
        return ""
    lines = []
    for hit in hits[:4]:
        citation = f" ({hit.citation})" if hit.citation else ""
        excerpt = hit.excerpt.replace("\n", " ").strip()
        lines.append(f"- {hit.title}{citation}: {excerpt[:220]}")
    return "\n".join(lines)


def derive_reconnaissance_hints(hits: list[RetrievalHit]) -> list[str]:
    tokens: list[str] = []
    for hit in hits[:4]:
        source_text = " ".join(part for part in [hit.title, hit.citation or ""] if part)
        for raw_token in source_text.replace("-", " ").replace("/", " ").split():
            token = raw_token.strip(" ,.;:()[]").lower()
            if len(token) < 4 or token in {"durch", "fuer", "nach", "oder", "diese", "quelle"}:
                continue
            if token not in tokens:
                tokens.append(token)
    return tokens[:5]
