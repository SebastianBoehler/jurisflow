from dataclasses import dataclass, field


@dataclass(slots=True)
class EmbeddingBatch:
    texts: list[str]
    vectors: list[list[float]] = field(default_factory=list)


@dataclass(slots=True)
class EmbeddingProviderConfig:
    backend: str
    model_name: str
    batch_size: int = 16
    cache_size: int = 2_048
