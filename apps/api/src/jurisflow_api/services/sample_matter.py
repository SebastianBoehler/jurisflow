from datetime import date, timedelta
from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from jurisflow_api.services.audit import log_action
from jurisflow_api.services.matters import ensure_tenant
from jurisflow_db.models import (
    Deadline,
    Document,
    DocumentChunk,
    DocumentExtraction,
    Draft,
    EvidenceItem,
    Matter,
    ResearchResult,
    ResearchRun,
    StoredFile,
)
from jurisflow_shared import (
    DeadlineKind,
    DocumentKind,
    DocumentProcessingStatus,
    DraftKind,
    ResearchSource,
    get_settings,
)

SAMPLE_TITLE = "Musterakte Kaufvertrag"
SAMPLE_DESCRIPTION = "Demo-Sachverhalt mit Dokumenten, Fristen, Recherche, Entwurf und Anlagenverzeichnis."


def create_or_get_sample_matter(session: Session, tenant_id: UUID, actor_id: UUID | None) -> Matter:
    stmt = (
        select(Matter)
        .where(Matter.tenant_id == tenant_id, Matter.title == SAMPLE_TITLE)
        .order_by(Matter.created_at.desc())
    )
    existing = session.scalar(stmt)
    if existing is not None:
        return existing

    ensure_tenant(session, tenant_id)
    settings = get_settings()

    matter = Matter(
        tenant_id=tenant_id,
        title=SAMPLE_TITLE,
        description=SAMPLE_DESCRIPTION,
    )
    session.add(matter)
    session.flush()

    document_specs = [
        {
            "title": "Kaufvertrag.txt",
            "label": "Anlage K1",
            "summary": "Unterzeichneter Kaufvertrag ueber eine Produktionsanlage mit Bezug auf § 433 BGB.",
            "content": (
                "Kaufvertrag\n\nDie Klaegerin verkauft der Beklagten eine Produktionsanlage zum Preis "
                "von 48.000 EUR. Die Uebergabe erfolgt am 15.02.2026. Nach § 433 BGB schuldet die Beklagte "
                "die Zahlung des Kaufpreises. Eine Stellungnahmefrist bis zum 30.03.2026 wird gesetzt."
            ),
            "statutes": ["§ 433 BGB"],
        },
        {
            "title": "Rechnung.txt",
            "label": "Anlage K2",
            "summary": "Rechnung mit Faelligkeitsdatum und Mahnhinweis.",
            "content": (
                "Rechnung\n\nRechnungsbetrag: 48.000 EUR. Faelligkeit: 01.03.2026. Trotz Mahnung vom "
                "10.03.2026 erfolgte keine Zahlung. Die Berufungsfrist wird fuer den Fall einer negativen "
                "Entscheidung vorgemerkt."
            ),
            "statutes": ["§ 286 BGB"],
        },
        {
            "title": "E-Mail.txt",
            "label": "Anlage K3",
            "summary": "E-Mail-Korrespondenz zur Maengelruege und Vergleichsbereitschaft.",
            "content": (
                "E-Mail vom 18.03.2026\n\nDie Beklagte behauptet Maengel an der gelieferten Anlage. "
                "Die Klaegerin weist darauf hin, dass die gelieferten Komponenten vertragsgemaess waren "
                "und bittet um Stellungnahmefrist binnen sieben Tagen."
            ),
            "statutes": ["§ 434 BGB"],
        },
    ]

    created_documents: list[Document] = []
    for position, spec in enumerate(document_specs, start=1):
        created_documents.append(
            _create_document_bundle(
                session=session,
                tenant_id=tenant_id,
                matter_id=matter.id,
                position=position,
                storage_root=settings.storage_root,
                title=spec["title"],
                evidence_label=spec["label"],
                summary=spec["summary"],
                content=spec["content"],
                statutes=spec["statutes"],
            )
        )

    deadlines = [
        {
            "label": "Stellungnahmefrist",
            "kind": DeadlineKind.STATEMENT.value,
            "due_date": date.today() + timedelta(days=10),
            "excerpt": "Gerichtliche Stellungnahmefrist aus dem Kaufvertrag.",
            "document_id": created_documents[0].id,
        },
        {
            "label": "Berufungsfrist",
            "kind": DeadlineKind.APPEAL.value,
            "due_date": date.today() + timedelta(days=30),
            "excerpt": "Vorgemerkte Berufungsfrist laut Rechnungs- und Prozessnotiz.",
            "document_id": created_documents[1].id,
        },
    ]
    for deadline in deadlines:
        session.add(
            Deadline(
                tenant_id=tenant_id,
                matter_id=matter.id,
                document_id=deadline["document_id"],
                kind=deadline["kind"],
                label=deadline["label"],
                due_date=deadline["due_date"],
                source_excerpt=deadline["excerpt"],
                confidence=0.88,
            )
        )

    research_run = ResearchRun(
        tenant_id=tenant_id,
        matter_id=matter.id,
        query="Ansprueche aus Kaufvertrag bei Kaufpreisforderung und Maengelruege",
        focus="Anspruchsgrundlagen, Darlegungslast bei Maengeln und interne Beleglage",
        sources=[
            ResearchSource.FEDERAL_LAW.value,
            ResearchSource.CASE_LAW.value,
            ResearchSource.INTERNAL_DOCS.value,
        ],
        max_results=8,
        deep_research=True,
        status="ready",
        summary=(
            "Bundesrecht, BGH-Rechtsprechung und die interne Akte sprechen ueberwiegend fuer eine "
            "durchsetzbare Kaufpreisforderung mit streitiger Maengelabwehr."
        ),
        trace=[
            {
                "key": "planner",
                "label": "Rechercheplan erstellen",
                "agent": "QueryPlannerAgent",
                "status": "complete",
                "detail": "3 Suchaufgaben ueber 3 Quellen geplant.",
                "source": None,
                "kind": "stage",
                "started_at": None,
                "finished_at": None,
                "metadata": {"strategy": "Bundesrecht, BGH-Rechtsprechung und interne Akte kombinieren."},
            },
            {
                "key": "search:federal_law",
                "label": "Bundesrecht durchsuchen",
                "agent": "FederalLawSearchAgent",
                "status": "complete",
                "detail": "1 hochrelevante Normstelle identifiziert.",
                "source": ResearchSource.FEDERAL_LAW.value,
                "kind": "stage",
                "started_at": None,
                "finished_at": None,
                "metadata": {"result_count": 1},
            },
            {
                "key": "search:case_law",
                "label": "Rechtsprechung durchsuchen",
                "agent": "CaseLawSearchAgent",
                "status": "complete",
                "detail": "1 BGH-Entscheidung mit Darlegungslast-Fokus priorisiert.",
                "source": ResearchSource.CASE_LAW.value,
                "kind": "stage",
                "started_at": None,
                "finished_at": None,
                "metadata": {"result_count": 1},
            },
            {
                "key": "search:internal_docs",
                "label": "Interne Dokumente durchsuchen",
                "agent": "InternalDocsSearchAgent",
                "status": "complete",
                "detail": "1 belastbare Aktennotiz zum Mahn- und Rechnungsverlauf gefunden.",
                "source": ResearchSource.INTERNAL_DOCS.value,
                "kind": "stage",
                "started_at": None,
                "finished_at": None,
                "metadata": {"result_count": 1},
            },
            {
                "key": "synthesis",
                "label": "Memo formulieren",
                "agent": "SynthesisAgent",
                "status": "complete",
                "detail": "Recherche zu einer durchsetzbaren Kaufpreisforderung verdichtet.",
                "source": None,
                "kind": "stage",
                "started_at": None,
                "finished_at": None,
                "metadata": {},
            },
        ],
        artifacts=[
            {
                "key": "research-plan",
                "kind": "plan",
                "title": "Rechercheplan",
                "content": "# Rechercheplan\n\n- Bundesrecht: § 433 BGB und Folgevorschriften\n- Rechtsprechung: BGH zur Darlegungslast bei Maengeln\n- Interne Akte: Rechnung, Mahnung und E-Mail-Korrespondenz",
                "metadata": {"task_count": 3},
            },
            {
                "key": "research-memo",
                "kind": "memo",
                "title": "Research Memo",
                "content": "# Research Memo\n\nDie Kaufpreisforderung ist prima facie schluessig. Die behauptete Maengelabwehr wirkt derzeit nur begrenzt belastbar, solange keine konkreten Maengel nachgewiesen werden.",
                "metadata": {"result_count": 3},
            },
        ],
    )
    session.add(research_run)
    session.flush()

    research_results = [
        {
            "source": ResearchSource.FEDERAL_LAW.value,
            "title": "BGB Kaufvertrag",
            "citation": "§ 433 BGB",
            "excerpt": "Der Verkaeufer ist zur Uebergabe und Uebereignung verpflichtet, der Kaeufer zur Zahlung.",
            "score": 0.97,
        },
        {
            "source": ResearchSource.CASE_LAW.value,
            "title": "BGH zur Darlegung von Maengeln",
            "citation": "BGH, Urteil vom 12.01.2024",
            "excerpt": "Die Darlegungslast fuer konkrete Maengel bleibt fuer die Verteidigung zentral.",
            "score": 0.83,
        },
        {
            "source": ResearchSource.INTERNAL_DOCS.value,
            "title": "Interne Aktennotiz",
            "citation": None,
            "excerpt": "Die Rechnungsfaelligkeit und Mahnung sind durch Anlage K2 belastbar belegt.",
            "score": 0.76,
        },
    ]
    for result in research_results:
        session.add(
            ResearchResult(
                research_run_id=research_run.id,
                source=result["source"],
                title=result["title"],
                citation=result["citation"],
                excerpt=result["excerpt"],
                relevance_score=result["score"],
            )
        )

    session.add(
        Draft(
            tenant_id=tenant_id,
            matter_id=matter.id,
            kind=DraftKind.PLEADING_OUTLINE.value,
            title="Klageentwurf Kaufpreisforderung",
            status="ready",
            content=(
                "Sachverhalt\nDie Klaegerin verlangt restlichen Kaufpreis aus Anlage K1.\n\n"
                "Rechtliche Wuerdigung\nAnspruch aus § 433 Abs. 2 BGB, Verzugserwaegungen aus § 286 BGB.\n\n"
                "Beweisantraege\nBezugnahme auf Anlage K1 bis K3.\n\n"
                "Antraege\nVerurteilung der Beklagten zur Zahlung nebst Zinsen."
            ),
        )
    )

    log_action(
        session,
        tenant_id=tenant_id,
        actor_id=actor_id,
        action="matter.sample_created",
        entity_type="matter",
        entity_id=matter.id,
        details={"title": matter.title},
    )
    session.commit()
    session.refresh(matter)
    return matter


def _create_document_bundle(
    *,
    session: Session,
    tenant_id: UUID,
    matter_id: UUID,
    position: int,
    storage_root: Path,
    title: str,
    evidence_label: str,
    summary: str,
    content: str,
    statutes: list[str],
) -> Document:
    matter_root = storage_root / str(matter_id)
    matter_root.mkdir(parents=True, exist_ok=True)
    filename = f"{position:02d}-{title}"
    file_path = matter_root / filename
    file_path.write_text(content, encoding="utf-8")

    stored_file = StoredFile(
        tenant_id=tenant_id,
        original_filename=title,
        mime_type="text/plain",
        storage_path=str(file_path),
        size_bytes=len(content.encode("utf-8")),
    )
    session.add(stored_file)
    session.flush()

    document = Document(
        tenant_id=tenant_id,
        matter_id=matter_id,
        stored_file_id=stored_file.id,
        title=title.replace(".txt", ""),
        kind=DocumentKind.TXT.value,
        processing_status=DocumentProcessingStatus.READY.value,
        classification="sample_legal_document",
        summary=summary,
    )
    session.add(document)
    session.flush()

    session.add(
        DocumentExtraction(
            tenant_id=tenant_id,
            document_id=document.id,
            parties=[{"role": "plaintiff", "label": "Klaegerin"}, {"role": "defendant", "label": "Beklagte"}],
            key_dates=[{"label": "created_for_demo", "value": str(date.today())}],
            deadlines=[],
            statute_references=statutes,
            summary=summary,
        )
    )
    session.add(
        DocumentChunk(
            tenant_id=tenant_id,
            document_id=document.id,
            chunk_index=0,
            content=content,
            keywords=" ".join(statutes),
            embedding=None,
        )
    )
    session.add(
        EvidenceItem(
            tenant_id=tenant_id,
            matter_id=matter_id,
            document_id=document.id,
            label=evidence_label,
            title=document.title,
            position=position,
        )
    )
    return document
