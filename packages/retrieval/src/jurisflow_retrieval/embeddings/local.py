from __future__ import annotations

from collections import OrderedDict
from functools import lru_cache
from threading import Lock

from jurisflow_retrieval.embeddings.base import EmbeddingProvider
from jurisflow_shared import get_settings


def _normalize_text(value: str) -> str:
    return " ".join(value.split())


class LocalTextEmbeddingProvider(EmbeddingProvider):
    def __init__(
        self,
        *,
        model_name: str,
        batch_size: int = 16,
        cache_size: int = 2_048,
    ) -> None:
        self._model_name = model_name
        self._batch_size = max(1, batch_size)
        self._cache_size = max(0, cache_size)
        self._cache: OrderedDict[str, list[float]] = OrderedDict()
        self._lock = Lock()
        self._model = None
        self._dimension: int | None = None

    @property
    def backend(self) -> str:
        return "sentence_transformers"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimension(self) -> int | None:
        return self._dimension

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        normalized = [_normalize_text(text) for text in texts]
        if not normalized:
            return []

        uncached = [text for text in normalized if text not in self._cache]
        if uncached:
            vectors = self._encode_uncached(uncached)
            with self._lock:
                for text, vector in zip(uncached, vectors, strict=True):
                    self._cache[text] = vector
                    self._cache.move_to_end(text)
                while self._cache_size and len(self._cache) > self._cache_size:
                    self._cache.popitem(last=False)

        with self._lock:
            return [list(self._cache[text]) for text in normalized]

    def _encode_uncached(self, texts: list[str]) -> list[list[float]]:
        model = self._load_model()
        vectors = model.encode(
            texts,
            batch_size=self._batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        if self._dimension is None and len(vectors):
            self._dimension = int(len(vectors[0]))
        return [vector.tolist() for vector in vectors]

    def _load_model(self):
        if self._model is not None:
            return self._model
        try:
            from sentence_transformers import SentenceTransformer
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "sentence-transformers is required for local embeddings. "
                "Install the worker dependencies before running ingestion or vector retrieval."
            ) from exc
        self._model = SentenceTransformer(self._model_name, device="cpu")
        dimension = self._model.get_sentence_embedding_dimension()
        if dimension is not None:
            self._dimension = int(dimension)
        return self._model


@lru_cache(maxsize=1)
def get_local_embedding_provider() -> LocalTextEmbeddingProvider:
    settings = get_settings()
    return LocalTextEmbeddingProvider(
        model_name=settings.embedding_model,
        batch_size=settings.embedding_batch_size,
        cache_size=settings.embedding_cache_size,
    )
