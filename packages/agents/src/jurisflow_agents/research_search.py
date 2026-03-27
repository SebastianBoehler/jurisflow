"""Source-specific legal retrieval helpers for the research workflow."""
from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import select

from jurisflow_agents.research_router import should_run_refinement
from jurisflow_agents.research_support import SOURCE_LABELS, score_internal_chunk, tokenize
from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_db.models import Document, DocumentChunk
from jurisflow_db.session import get_session_factory
from jurisflow_retrieval import extract_legal_references, merge_results
from jurisflow_retrieval.embeddings import get_local_embedding_provider
from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.providers.case_law import CaseLawProvider
from jurisflow_retrieval.providers.dejure import DejureProvider
from jurisflow_retrieval.providers.eurlex import EurLexProvider
from jurisflow_retrieval.providers.federal import FederalLawProvider
from jurisflow_retrieval.providers.firecrawl import FirecrawlProvider
from jurisflow_retrieval.providers.general_web import GeneralWebSearchProvider
from jurisflow_retrieval.providers.openjur import OpenJurProvider
from jurisflow_retrieval.providers.state_law import StateLawProvider
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import AuthorityLevel, ResearchSource
from jurisflow_shared.config import get_settings

def build_source_providers(source: ResearchSource) -> list[ResearchProvider]:
    settings = get_settings()
    if source == ResearchSource.CASE_LAW:
        return [CaseLawProvider(), OpenJurProvider()]
    if source == ResearchSource.GENERAL_WEB:
        providers: list[ResearchProvider] = [GeneralWebSearchProvider()]
        if settings.firecrawl_api_key:
            providers.append(FirecrawlProvider(settings.firecrawl_api_key))
        return providers
    return {
        ResearchSource.FEDERAL_LAW: [FederalLawProvider(), DejureProvider()],
        ResearchSource.STATE_LAW: [StateLawProvider()],
        ResearchSource.EU_LAW: [EurLexProvider()],
    }.get(source, [GeneralWebSearchProvider()])

def consume_queries(state: ResearchWorkflowState, source: ResearchSource) -> list[str]:
    with state.lock:
        queries = state.pending_queries.get(source, [])
        state.pending_queries[source] = []
        if not queries:
            return []
        executed = state.executed_queries.setdefault(source, [])
        fresh_queries = [query for query in queries if query not in executed]
        executed.extend(fresh_queries)
    return fresh_queries

def search_agent_name(source: ResearchSource) -> str:
    return {
        ResearchSource.FEDERAL_LAW: "FederalLawSearchAgent",
        ResearchSource.STATE_LAW: "StateLawSearchAgent",
        ResearchSource.CASE_LAW: "CaseLawSearchAgent",
        ResearchSource.EU_LAW: "EuLawSearchAgent",
        ResearchSource.INTERNAL_DOCS: "InternalDocsSearchAgent",
        ResearchSource.GENERAL_WEB: "GeneralWebSearchAgent",
    }[source]

def run_source_search(state: ResearchWorkflowState, source: ResearchSource) -> list[RetrievalHit]:
    if source not in state.enabled_sources:
        _update_source_stage(state, source, "skipped", "Keine Suchanfragen fuer diese Quelle vorhanden.")
        return []

    queries = consume_queries(state, source)
    if not queries:
        return _handle_empty_query_round(state, source)

    providers = build_source_providers(source)
    hits: list[RetrievalHit] = []
    errors: list[str] = []
    executed_queries: list[str] = []
    max_results = max(2, state.payload.request.max_results // max(1, len(queries)))

    for index, query in enumerate(queries):
        if index > 0 and not should_run_refinement(source, len(hits), len(queries)):
            break
        search_req = SearchRequest(query=query, focus=None, max_results=max_results, filters=state.payload.request.filters)
        executed_queries.append(query)
        for provider in providers:
            try:
                hits.extend(provider.search(search_req))
            except Exception as exc:
                errors.append(str(exc))

    with state.lock:
        state.source_results[source] = merge_results(state.source_results.get(source, []), hits, limit=state.payload.request.max_results)
        if errors:
            state.source_errors[source] = errors[0][:240]

    if errors and not hits:
        stage_status = "failed"
        stage_detail = errors[0][:160]
    elif errors:
        stage_status = "complete"
        stage_detail = f"{len(hits)} Treffer aus {len(executed_queries)} Suchanfragen. Hinweis: {errors[0][:120]}"
    else:
        stage_status = "complete"
        stage_detail = f"{len(hits)} Treffer aus {len(executed_queries)} Suchanfragen zusammengefuehrt."

    _update_source_stage(
        state,
        source,
        stage_status,
        stage_detail,
        metadata={"queries": executed_queries, "planned_queries": queries, "result_count": len(hits)},
    )
    return hits

def run_internal_docs_search(state: ResearchWorkflowState) -> list[RetrievalHit]:
    source = ResearchSource.INTERNAL_DOCS
    if source not in state.enabled_sources:
        _update_source_stage(state, source, "skipped", "Keine internen Suchanfragen vorhanden.")
        return []

    queries = consume_queries(state, source)
    if not queries:
        return _handle_empty_query_round(state, source, empty_label="Keine internen Suchanfragen vorhanden.")

    hits: list[RetrievalHit] = []
    session = get_session_factory()()
    try:
        lexical_rows = list(
            session.execute(
                select(DocumentChunk, Document.title)
                .join(Document, Document.id == DocumentChunk.document_id)
                .where(
                    DocumentChunk.tenant_id == state.payload.tenant_id,
                    Document.tenant_id == state.payload.tenant_id,
                    Document.matter_id == state.payload.matter_id,
                )
            )
        )

        for query in queries:
            lexical_hits = _lexical_internal_hits(lexical_rows, query, state.payload.request.max_results * 4)
            vector_hits = _vector_internal_hits(session, state, query, state.payload.request.max_results * 4)
            hits.extend(_merge_internal_hits(lexical_hits, vector_hits))
    except Exception as exc:
        with state.lock:
            state.source_errors[source] = str(exc)[:240]
        _update_source_stage(
            state,
            source,
            "failed",
            f"Interne Vektorsuche fehlgeschlagen: {str(exc)[:160]}",
            metadata={"queries": queries, "result_count": 0},
        )
        return []
    finally:
        session.close()

    with state.lock:
        state.source_results[source] = merge_results(state.source_results.get(source, []), hits, limit=state.payload.request.max_results)
        if not hits:
            state.source_errors[source] = "Keine relevanten internen Dokumentstellen gefunden."

    _update_source_stage(
        state,
        source,
        "complete" if hits else "failed",
        f"{len(hits)} interne Fundstellen identifiziert." if hits else "Keine relevanten internen Dokumentstellen gefunden.",
        metadata={"queries": queries, "result_count": len(hits)},
    )
    return hits

def _handle_empty_query_round(
    state: ResearchWorkflowState,
    source: ResearchSource,
    *,
    empty_label: str = "Keine Suchanfragen fuer diese Quelle vorhanden.",
) -> list[RetrievalHit]:
    with state.lock:
        executed_query_count = len(state.executed_queries.get(source, []))
        result_count = len(state.source_results.get(source, []))

    if executed_query_count or result_count:
        _update_source_stage(
            state,
            source,
            "complete",
            f"Keine weiteren Suchanfragen in dieser Runde. Bisher {result_count} Treffer aus {executed_query_count} Suchanfragen.",
            metadata={"queries": state.executed_queries.get(source, []), "result_count": result_count},
        )
        return []

    _update_source_stage(state, source, "skipped", empty_label)
    return []

def _lexical_internal_hits(
    rows: Iterable[tuple[DocumentChunk, str]],
    query: str,
    limit: int,
) -> list[RetrievalHit]:
    query_tokens = tokenize(query)
    hits: list[RetrievalHit] = []
    for chunk, title in rows:
        score = score_internal_chunk(chunk.content, chunk.keywords or "", query_tokens)
        if score <= 0:
            continue
        hits.append(_internal_hit(chunk, title, score))
    return sorted(hits, key=lambda hit: hit.relevance_score, reverse=True)[:limit]

def _vector_internal_hits(session, state: ResearchWorkflowState, query: str, limit: int) -> list[RetrievalHit]:
    provider = get_local_embedding_provider()
    query_embedding = provider.embed_texts([query])[0]
    distance = DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
    stmt = (
        select(DocumentChunk, Document.title, distance)
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(
            DocumentChunk.tenant_id == state.payload.tenant_id,
            Document.tenant_id == state.payload.tenant_id,
            Document.matter_id == state.payload.matter_id,
            DocumentChunk.embedding.is_not(None),
        )
        .order_by(distance.asc())
        .limit(limit)
    )
    hits: list[RetrievalHit] = []
    for chunk, title, raw_distance in session.execute(stmt):
        distance_value = float(raw_distance or 0.0)
        score = 1.0 / (1.0 + max(0.0, distance_value))
        hits.append(_internal_hit(chunk, title, min(0.99, score)))
    return hits

def _merge_internal_hits(lexical_hits: list[RetrievalHit], vector_hits: list[RetrievalHit]) -> list[RetrievalHit]:
    combined: dict[str, RetrievalHit] = {}
    lexical_by_chunk = {str(hit.chunk_id): hit for hit in lexical_hits if hit.chunk_id}
    vector_by_chunk = {str(hit.chunk_id): hit for hit in vector_hits if hit.chunk_id}

    for chunk_id in set(lexical_by_chunk) | set(vector_by_chunk):
        lexical_hit = lexical_by_chunk.get(chunk_id)
        vector_hit = vector_by_chunk.get(chunk_id)
        base_hit = lexical_hit or vector_hit
        if base_hit is None:
            continue
        lexical_score = lexical_hit.relevance_score if lexical_hit else 0.0
        vector_score = vector_hit.relevance_score if vector_hit else 0.0
        both_signals_bonus = 0.08 if lexical_hit and vector_hit else 0.0
        combined_score = min(0.99, max(lexical_score, vector_score * 0.95) + both_signals_bonus)
        combined[chunk_id] = RetrievalHit(
            source=base_hit.source,
            source_id=base_hit.source_id,
            title=base_hit.title,
            excerpt=base_hit.excerpt,
            citation=base_hit.citation,
            citations=base_hit.citations,
            relevance_score=combined_score,
            authority=AuthorityLevel.FACTUAL,
            modality=base_hit.modality,
            document_id=base_hit.document_id,
            chunk_id=base_hit.chunk_id,
            url=base_hit.url,
        )

    return sorted(combined.values(), key=lambda hit: hit.relevance_score, reverse=True)


def _internal_hit(chunk: DocumentChunk, title: str, score: float) -> RetrievalHit:
    citations = extract_legal_references(chunk.content)[:8]
    return RetrievalHit(
        source=ResearchSource.INTERNAL_DOCS,
        source_id=f"document:{chunk.document_id}",
        title=title,
        excerpt=chunk.content[:450],
        citation=citations[0] if citations else None,
        citations=citations,
        relevance_score=score,
        authority=AuthorityLevel.FACTUAL,
        document_id=chunk.document_id,
        chunk_id=chunk.id,
    )


def _update_source_stage(
    state: ResearchWorkflowState,
    source: ResearchSource,
    status: str,
    detail: str,
    *,
    metadata: dict | None = None,
) -> None:
    from jurisflow_agents.research_observability import update_stage

    update_stage(
        state,
        key=f"search:{source.value}",
        label=f"{SOURCE_LABELS[source]} durchsuchen",
        agent=search_agent_name(source),
        status=status,
        detail=detail,
        source=source,
        metadata=metadata or {},
    )
