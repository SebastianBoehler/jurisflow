from datetime import date, timedelta
from pathlib import Path
from uuid import UUID

from sqlalchemy import delete, select

from jurisflow_agents import run_research_workflow
from jurisflow_agents.research_observability import snapshot_state
from jurisflow_agents.research_types import ResearchWorkflowInput
from jurisflow_db.models import Deadline, Document, DocumentChunk, DocumentExtraction, Draft, ResearchResult, ResearchRun, StoredFile
from jurisflow_db.session import get_session_factory
from jurisflow_parsers import parse_document
from jurisflow_retrieval import extract_statute_references, ingest_text_document, normalize_text
from jurisflow_retrieval.embeddings import get_local_embedding_provider
from jurisflow_shared import DeadlineKind, ResearchRequest


def _session():
    return get_session_factory()()


def _detect_deadlines(text: str) -> list[dict]:
    lowered = text.lower()
    deadlines: list[dict] = []
    if "stellungnahmefrist" in lowered:
        deadlines.append({"kind": DeadlineKind.STATEMENT.value, "label": "Stellungnahmefrist", "confidence": 0.78})
    if "berufungsfrist" in lowered:
        deadlines.append({"kind": DeadlineKind.APPEAL.value, "label": "Berufungsfrist", "confidence": 0.85})
    if not deadlines:
        deadlines.append({"kind": DeadlineKind.OTHER.value, "label": "Prueffrist", "confidence": 0.2})
    return deadlines


def _extract_parties(text: str) -> list[dict]:
    parties: list[dict] = []
    if "klaeger" in text.lower():
        parties.append({"role": "plaintiff", "label": "Klaeger"})
    if "beklagte" in text.lower():
        parties.append({"role": "defendant", "label": "Beklagte"})
    return parties


async def process_document(_: dict, document_id: str, tenant_id: str) -> None:
    session = _session()
    try:
        document = session.get(Document, UUID(document_id))
        if document is None or str(document.tenant_id) != tenant_id:
            return
        document.processing_status = "processing"
        session.commit()

        stored_file = session.get(StoredFile, document.stored_file_id)
        parsed = parse_document(Path(stored_file.storage_path), stored_file.mime_type)
        normalized_text = normalize_text(parsed.text)
        prepared_chunks = ingest_text_document(normalized_text, provider=get_local_embedding_provider()) if normalized_text else []

        session.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
        extraction = session.scalar(select(DocumentExtraction).where(DocumentExtraction.document_id == document.id))
        if extraction is None:
            extraction = DocumentExtraction(tenant_id=document.tenant_id, document_id=document.id)
            session.add(extraction)

        summary = normalized_text[:400] if normalized_text else "No text extracted."
        extraction.summary = summary
        extraction.parties = _extract_parties(normalized_text)
        extraction.deadlines = _detect_deadlines(normalized_text)
        extraction.key_dates = [{"label": "imported_on", "value": str(date.today())}]
        extraction.statute_references = extract_statute_references(normalized_text)

        for prepared in prepared_chunks:
            session.add(
                DocumentChunk(
                    tenant_id=document.tenant_id,
                    document_id=document.id,
                    chunk_index=prepared.chunk_index,
                    content=prepared.text,
                    keywords=" ".join(prepared.keywords) or None,
                    embedding=prepared.embedding,
                )
            )

        session.execute(delete(Deadline).where(Deadline.document_id == document.id))
        for deadline in extraction.deadlines:
            session.add(
                Deadline(
                    tenant_id=document.tenant_id,
                    matter_id=document.matter_id,
                    document_id=document.id,
                    kind=deadline["kind"],
                    label=deadline["label"],
                    confidence=deadline["confidence"],
                    due_date=date.today() + timedelta(days=14),
                    source_excerpt=summary[:180],
                )
            )

        document.processing_status = "ready"
        document.summary = summary
        document.classification = "legal_document"
        session.commit()
    except Exception as exc:
        session.rollback()
        document = session.get(Document, UUID(document_id))
        if document is not None and str(document.tenant_id) == tenant_id:
            document.processing_status = "failed"
            document.summary = f"Dokumentenverarbeitung fehlgeschlagen: {str(exc)[:300]}"
            session.commit()
        raise
    finally:
        session.close()


async def run_research(_: dict, research_run_id: str, tenant_id: str, payload_json: str) -> None:
    session = _session()
    try:
        run = session.get(ResearchRun, UUID(research_run_id))
        if run is None or str(run.tenant_id) != tenant_id:
            return
        run.status = "processing"
        run.summary = "Deep Research wird gestartet."
        session.commit()

        def persist_progress(workflow_state) -> None:
            trace, artifacts, summary = snapshot_state(workflow_state)
            run.trace = trace
            run.artifacts = artifacts
            run.summary = summary
            session.commit()

        try:
            workflow_state = run_research_workflow(
                ResearchWorkflowInput(
                    tenant_id=UUID(tenant_id),
                    matter_id=run.matter_id,
                    request=ResearchRequest.model_validate_json(payload_json),
                ),
                on_update=persist_progress,
            )
            session.execute(delete(ResearchResult).where(ResearchResult.research_run_id == run.id))
            for hit in workflow_state.merged_results:
                session.add(
                    ResearchResult(
                        research_run_id=run.id,
                        source=hit.source.value,
                        source_id=hit.source_id,
                        title=hit.title,
                        citation=hit.citation,
                        citations=hit.citations,
                        excerpt=hit.excerpt,
                        relevance_score=hit.relevance_score,
                        authority=hit.authority.value if hit.authority else None,
                        modality=hit.modality.value,
                        document_id=hit.document_id,
                        chunk_id=hit.chunk_id,
                        url=hit.url,
                    )
                )
            run.trace = workflow_state.trace
            run.artifacts = workflow_state.artifacts
            run.summary = workflow_state.summary
            run.status = "ready"
        except Exception as exc:
            run.summary = f"Recherchelauf fehlgeschlagen: {str(exc)[:500]}"
            run.status = "failed"
        session.commit()
    finally:
        session.close()


async def generate_draft(_: dict, draft_id: str, tenant_id: str) -> None:
    session = _session()
    try:
        draft = session.get(Draft, UUID(draft_id))
        if draft is None or str(draft.tenant_id) != tenant_id:
            return
        draft.status = "processing"
        session.commit()
        draft.content = "\n\n".join(
            [
                "Sachverhalt\nDie wesentlichen Tatsachen werden strukturiert zusammengefasst.",
                "Rechtliche Würdigung\nAnspruchsgrundlagen und Gegenargumente werden geordnet dargestellt.",
                "Beweisanträge\nBezug auf Anlage K1 ff. und weitere Beweisangebote.",
                "Anträge\nKonkrete prozessuale Anträge in deutscher Schriftsatzlogik.",
            ]
        )
        draft.status = "ready"
        session.commit()
    finally:
        session.close()
