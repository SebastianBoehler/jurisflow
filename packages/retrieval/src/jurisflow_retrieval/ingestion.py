from __future__ import annotations

from dataclasses import dataclass, field

from jurisflow_retrieval.citations import extract_legal_references
from jurisflow_retrieval.embeddings.base import EmbeddingProvider


@dataclass(slots=True)
class PreparedTextChunk:
    chunk_index: int
    text: str
    keywords: list[str] = field(default_factory=list)
    embedding: list[float] = field(default_factory=list)


def normalize_text(value: str) -> str:
    stripped_lines = [line.strip() for line in value.replace("\u00a0", " ").splitlines()]
    collapsed = "\n".join(line for line in stripped_lines if line)
    return collapsed.strip()


def chunk_text(value: str, *, target_size: int = 900, overlap: int = 120) -> list[str]:
    normalized = normalize_text(value)
    if not normalized:
        return []

    paragraphs = [paragraph.strip() for paragraph in normalized.split("\n") if paragraph.strip()]
    chunks: list[str] = []
    current = ""
    trailing_overlap = ""

    for paragraph in paragraphs:
        candidate = "\n".join(part for part in [current, paragraph] if part).strip()
        if current and len(candidate) > target_size:
            chunks.append(current)
            trailing_overlap = current[-overlap:].strip()
            current = "\n".join(part for part in [trailing_overlap, paragraph] if part).strip()
            continue
        current = candidate

    if current:
        chunks.append(current)
    return chunks


def ingest_text_document(
    text: str,
    *,
    provider: EmbeddingProvider,
    target_size: int = 900,
    overlap: int = 120,
) -> list[PreparedTextChunk]:
    chunks = chunk_text(text, target_size=target_size, overlap=overlap)
    if not chunks:
        return []

    embeddings = provider.embed_texts(chunks)
    prepared: list[PreparedTextChunk] = []
    for index, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
        prepared.append(
            PreparedTextChunk(
                chunk_index=index,
                text=chunk,
                keywords=extract_legal_references(chunk),
                embedding=embedding,
            )
        )
    return prepared
