import re


# Negative lookahead: don't capture subsection keywords as law abbreviations
_NOT_SUBSECTION = r"(?!(?:Abs|Nr|Satz|Lit|Alt|Buchst|Spiegelstrich)\b)"
# Law abbreviation: uppercase-dominant, 2–20 chars (BGB, StGB, DSGVO, GmbHG, SGB, GG …)
_LAW_ABBREV = _NOT_SUBSECTION + r"[A-ZÄÖÜ][A-Za-zäöüÄÖÜß]{1,19}"
# Optional sub-references: Abs. 1, Nr. 2, Satz 3, f., ff.
_SUB_REF = r"(?:\s+(?:Abs\.?\s*\d+|Nr\.?\s*\d+|Satz\s*\d+|ff?\.?))*"

# § 242 BGB  |  §§ 242 ff. BGB  |  § 123a Abs. 1 Nr. 2 SGB V  |  § 43a BRAO
STATUTE_PATTERN = re.compile(r"§{1,2}\s*\d+[a-zA-Z]?" + _SUB_REF + r"\s+" + _LAW_ABBREV)

# Art. 5 DSGVO  |  Art. 267 Abs. 2 AEUV  |  Art. 1 GG
ARTICLE_PATTERN = re.compile(r"Art\.?\s*\d+[a-zA-Z]?" + _SUB_REF + r"\s+" + _LAW_ABBREV)

# CELEX number embedded in EUR-Lex URLs, e.g. CELEX:32016R0679 or celex=32016R0679
CELEX_PATTERN = re.compile(r"(?:CELEX[:/]?|celex=)([A-Z0-9]{5,20})", re.IGNORECASE)

# German court case references: BGH, Urt. v. 12.03.2020 – I ZR 45/19
COURT_PATTERN = re.compile(
    r"\b(?:BGH|BVerfG|BAG|BFH|BSG|BVerwG|OLG\s+\w+|LG\s+\w+|AG\s+\w+|OVG|VGH|LSG|VG|FG|BPatG)"
    r"(?:[,\s]+(?:Urt\.|Beschl\.|Beschluss|Urteil))?"
    r"(?:[,\s]+v\.?\s*\d{1,2}\.\d{1,2}\.\d{2,4})?"
    r"(?:\s*[-–]\s*[A-Z]{1,5}\s+[A-Z]{1,5}\s+\d+/\d+)?"
)


def extract_statute_references(text: str) -> list[str]:
    """Extract § references from text, deduplicated (used for direct URL lookup)."""
    seen: list[str] = []
    for match in STATUTE_PATTERN.findall(text):
        if match not in seen:
            seen.append(match)
    return seen


def extract_legal_references(text: str) -> list[str]:
    """Extract both § and Art. references, deduplicated."""
    seen: list[str] = []
    for pattern in (STATUTE_PATTERN, ARTICLE_PATTERN):
        for match in pattern.findall(text):
            if match not in seen:
                seen.append(match)
    return seen


def extract_celex_from_url(url: str) -> str | None:
    """Return the CELEX identifier embedded in an EUR-Lex URL, or None."""
    m = CELEX_PATTERN.search(url)
    return m.group(1) if m else None


def extract_court_reference(text: str) -> str | None:
    """Return the first court case reference found in text, or None."""
    m = COURT_PATTERN.search(text)
    return m.group(0).strip() if m else None
