from pathlib import Path

import fitz
import numpy as np
from PIL import Image

from jurisflow_parsers.types import ParsedDocument


def _has_text_layer(text: str) -> bool:
    return len(text.strip()) >= 50


def _ocr_with_paddle(file_path: Path) -> str:
    try:
        from paddleocr import PaddleOCR
    except Exception:
        return ""

    ocr = PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)
    texts: list[str] = []
    with fitz.open(file_path) as pdf:
        for page in pdf:
            pixmap = page.get_pixmap(dpi=200)
            image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            result = ocr.predict(np.array(image))
            for page_result in result:
                for line in page_result.get("rec_texts", []):
                    if line:
                        texts.append(line)
    return "\n".join(texts)


def parse_pdf(file_path: Path, mime_type: str) -> ParsedDocument:
    text_parts: list[str] = []
    with fitz.open(file_path) as pdf:
        for page in pdf:
            text_parts.append(page.get_text("text"))
    text = "\n".join(part.strip() for part in text_parts if part.strip())
    if _has_text_layer(text):
        return ParsedDocument(file_path=file_path, mime_type=mime_type, text=text, used_ocr=False)

    ocr_text = _ocr_with_paddle(file_path)
    return ParsedDocument(file_path=file_path, mime_type=mime_type, text=ocr_text or text, used_ocr=bool(ocr_text))

