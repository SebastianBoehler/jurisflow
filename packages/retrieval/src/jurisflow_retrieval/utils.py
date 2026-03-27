from html import unescape


def clean_text(value: str) -> str:
    return " ".join(unescape(value).split())


def decode_bytes(content: bytes) -> str:
    """Decode HTTP response bytes, preferring UTF-8 over latin-1.

    gesetze-im-internet.de and several older German legal portals historically
    served latin-1 encoded pages, but most have migrated to UTF-8.  Trying
    UTF-8 first prevents garbled umlauts (Ã¼ instead of ü) on modern pages
    while still handling legacy responses correctly.
    """
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="replace")
