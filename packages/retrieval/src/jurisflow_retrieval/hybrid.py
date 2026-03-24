from jurisflow_retrieval.types import RetrievalHit


def merge_results(*collections: list[RetrievalHit], limit: int = 10) -> list[RetrievalHit]:
    deduped: dict[tuple[str, str, str], RetrievalHit] = {}
    for collection in collections:
        for hit in collection:
            key = (
                hit.source.value,
                (hit.url or "").strip(),
                f"{hit.title}|{hit.citation or ''}".strip().lower(),
            )
            existing = deduped.get(key)
            if existing is None or hit.relevance_score > existing.relevance_score:
                deduped[key] = hit
    ranked = sorted(deduped.values(), key=_ranking_key, reverse=True)
    return ranked[:limit]


def _ranking_key(hit: RetrievalHit) -> tuple[float, int]:
    citation_bonus = 1 if hit.citation else 0
    return hit.relevance_score, citation_bonus
