from html import unescape


def clean_text(value: str) -> str:
    return " ".join(unescape(value).split())
