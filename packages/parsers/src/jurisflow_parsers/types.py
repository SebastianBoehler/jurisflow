from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class ParsedDocument:
    file_path: Path
    mime_type: str
    text: str
    used_ocr: bool = False
    metadata: dict[str, str] = field(default_factory=dict)

