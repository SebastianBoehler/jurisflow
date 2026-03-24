from pathlib import Path

from jurisflow_parsers.types import ParsedDocument


def parse_txt(file_path: Path, mime_type: str) -> ParsedDocument:
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    return ParsedDocument(file_path=file_path, mime_type=mime_type, text=text)

