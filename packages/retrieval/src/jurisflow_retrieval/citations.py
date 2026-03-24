import re


STATUTE_PATTERN = re.compile(r"§+\s*\d+[a-zA-Z]*\s+[A-ZÄÖÜa-zäöü]{2,10}")


def extract_statute_references(text: str) -> list[str]:
    seen: list[str] = []
    for match in STATUTE_PATTERN.findall(text):
        if match not in seen:
            seen.append(match)
    return seen

