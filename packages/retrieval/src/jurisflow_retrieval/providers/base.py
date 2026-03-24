from abc import ABC, abstractmethod

from jurisflow_retrieval.types import RetrievalHit, SearchRequest


class ResearchProvider(ABC):
    @abstractmethod
    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        raise NotImplementedError
