from pathlib import Path

from jurisflow_parsers.docx import parse_docx
from jurisflow_parsers.email_message import parse_email
from jurisflow_parsers.pdf import parse_pdf
from jurisflow_parsers.txt import parse_txt
from jurisflow_parsers.types import ParsedDocument


class ParserRegistry:
    def __init__(self) -> None:
        self._parsers = {
            ".pdf": parse_pdf,
            ".docx": parse_docx,
            ".txt": parse_txt,
            ".eml": parse_email,
        }

    def parse(self, file_path: Path, mime_type: str) -> ParsedDocument:
        parser = self._parsers.get(file_path.suffix.lower(), parse_txt)
        return parser(file_path, mime_type)


def parse_document(file_path: Path, mime_type: str) -> ParsedDocument:
    return ParserRegistry().parse(file_path, mime_type)

