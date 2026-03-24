from email import policy
from email.parser import BytesParser
from pathlib import Path

from jurisflow_parsers.types import ParsedDocument


def parse_email(file_path: Path, mime_type: str) -> ParsedDocument:
    message = BytesParser(policy=policy.default).parsebytes(file_path.read_bytes())
    parts = [
        f"Subject: {message.get('subject', '')}",
        f"From: {message.get('from', '')}",
        f"To: {message.get('to', '')}",
    ]
    body = message.get_body(preferencelist=("plain",))
    if body is not None:
        parts.append(body.get_content())
    text = "\n".join(part for part in parts if part)
    return ParsedDocument(file_path=file_path, mime_type=mime_type, text=text)

