from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def backend(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def model_name(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def dimension(self) -> int | None:
        raise NotImplementedError

    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError
