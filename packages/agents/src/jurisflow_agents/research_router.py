from collections.abc import Iterable

from jurisflow_agents.research_reconnaissance import derive_reconnaissance_hints
from jurisflow_agents.research_router_types import ResearchRoutePlan
from jurisflow_agents.research_support import SOURCE_LABELS, significant_terms
from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_retrieval import extract_statute_references
from jurisflow_shared import ResearchSource

PRACTICAL_ADMIN_TERMS = {
    "abstand",
    "blitzer",
    "bußgeld",
    "bussgeld",
    "ordnungswidrigkeit",
    "ortsschild",
    "polizei",
    "verwaltungsrichtlinie",
    "verwaltungsvorschrift",
}


def fallback_route_plan(state: ResearchWorkflowState) -> ResearchRoutePlan:
    query = state.contextual_query.strip() or state.payload.request.query.strip()
    focus = (state.payload.request.focus or "").strip()
    text = " ".join(part for part in [query, focus] if part)
    statutes = extract_statute_references(text)
    hints = derive_reconnaissance_hints(state.reconnaissance_hits)
    terms = significant_terms(text)
    legal_anchors = _merge_unique(statutes, _infer_anchor_hints(text), hints[:3])
    routes = []

    for source in state.enabled_sources:
        primary_query, refinement_query = build_lane_queries(
            source=source,
            query=query,
            focus=focus,
            legal_anchors=legal_anchors,
            terms=terms,
            hints=hints,
        )
        if not primary_query:
            continue
        routes.append(
            {
                "source": source,
                "rationale": f"Spezialisierte Suche in {SOURCE_LABELS[source]}.",
                "primary_query": primary_query,
                "refinement_query": refinement_query,
                "required_terms": legal_anchors[:3] or terms[:3],
            }
        )

    return ResearchRoutePlan.model_validate(
        {
            "objective": query,
            "search_strategy": (
                "Zuerst Zuständigkeiten und Anker ableiten, dann source-spezifisch parallel suchen, "
                "danach gezielt nur schwache Lanes nachschärfen."
            ),
            "legal_anchors": legal_anchors[:10],
            "jurisdiction_hints": _infer_jurisdiction_hints(text, legal_anchors),
            "key_issues": terms[:6],
            "source_routes": routes,
        }
    )


def route_plan_to_queries(plan: ResearchRoutePlan, enabled_sources: list[ResearchSource]) -> dict[ResearchSource, list[str]]:
    queries = {source: [] for source in enabled_sources}
    for route in plan.source_routes:
        if route.source not in queries:
            continue
        for query in [route.primary_query, route.refinement_query]:
            if query and query not in queries[route.source]:
                queries[route.source].append(query)
    return queries


def build_lane_queries(
    *,
    source: ResearchSource,
    query: str,
    focus: str,
    legal_anchors: list[str],
    terms: list[str],
    hints: list[str],
) -> tuple[str, str | None]:
    anchor_text = " ".join(legal_anchors[:3]).strip()
    statute_anchor_text = " ".join(anchor for anchor in legal_anchors if anchor.startswith("§")).strip()
    hint_text = " ".join(hints[:4]).strip()
    term_text = " ".join(terms[:5]).strip()
    base = " ".join(part for part in [query, focus] if part).strip()
    lowered = base.lower()

    if source is ResearchSource.FEDERAL_LAW:
        primary = " ".join(part for part in [statute_anchor_text or anchor_text or base, "Bundesrecht Gesetz Paragraph"] if part).strip()
        refinement = " ".join(part for part in [base, statute_anchor_text or term_text, "BGB StVG StVO VwV"] if part).strip()
        return primary, refinement if refinement != primary else None

    if source is ResearchSource.STATE_LAW:
        if not _is_state_topic(lowered, legal_anchors):
            return "", None
        primary = " ".join(
            part
            for part in [base, anchor_text, hint_text, "Landesrecht Verwaltungsvorschrift Erlass Polizei Ministerium"]
            if part
        ).strip()
        refinement = " ".join(part for part in [base, term_text, "Bundesland Richtlinie Abstand Ortsschild"] if part).strip()
        return primary, refinement if refinement != primary else None

    if source is ResearchSource.CASE_LAW:
        primary = " ".join(part for part in [base, statute_anchor_text or anchor_text, term_text, "Urteil Beschluss BGH OLG OVG VGH"] if part).strip()
        refinement = " ".join(part for part in [base, statute_anchor_text or term_text, "Rechtsprechung Kündigung Zahlungsverzug Abstand Messstelle"] if part).strip()
        return primary, refinement if refinement != primary else None

    if source is ResearchSource.EU_LAW:
        if not _is_eu_topic(lowered, legal_anchors):
            return "", None
        primary = " ".join(part for part in [base, anchor_text, "EU-Recht Richtlinie Verordnung"] if part).strip()
        refinement = " ".join(part for part in [term_text, "EUR-Lex"] if part).strip()
        return primary, refinement if refinement != primary else None

    return base, None


def should_run_refinement(source: ResearchSource, hit_count: int, route_query_count: int) -> bool:
    if route_query_count <= 1:
        return False
    if source in {ResearchSource.FEDERAL_LAW, ResearchSource.STATE_LAW, ResearchSource.CASE_LAW}:
        return hit_count < 2
    return hit_count == 0


def _infer_anchor_hints(text: str) -> list[str]:
    lowered = text.lower()
    hints: list[str] = []
    if "fristlose kündigung" in lowered and "zahlungsverzug" in lowered:
        hints.extend(["§ 543 BGB", "§ 569 BGB", "§ 573 BGB"])
    elif "fristlose kündigung" in lowered:
        hints.append("§ 626 BGB")
    if any(term in lowered for term in PRACTICAL_ADMIN_TERMS):
        hints.extend(["StVO", "VwV-StVO", "Verwaltungsvorschrift", "Messstelle"])
    return _merge_unique(hints)


def _infer_jurisdiction_hints(text: str, legal_anchors: list[str]) -> list[str]:
    lowered = text.lower()
    hints: list[str] = []
    if any(term in lowered for term in PRACTICAL_ADMIN_TERMS):
        hints.extend(["Landesrecht", "Verwaltungspraxis"])
    if any(anchor.startswith("§") for anchor in legal_anchors):
        hints.append("Bundesrecht")
    return _merge_unique(hints)


def _merge_unique(*parts: Iterable[str]) -> list[str]:
    merged: list[str] = []
    for collection in parts:
        for item in collection:
            normalized = " ".join(item.split()).strip()
            if normalized and normalized not in merged:
                merged.append(normalized)
    return merged


def _is_state_topic(text: str, legal_anchors: list[str]) -> bool:
    if any(term in text for term in PRACTICAL_ADMIN_TERMS):
        return True
    return any(anchor in {"StVO", "VwV-StVO", "Verwaltungsvorschrift", "Messstelle"} for anchor in legal_anchors)


def _is_eu_topic(text: str, legal_anchors: list[str]) -> bool:
    if any(term in text for term in ("eu", "eu-recht", "eur-lex", "richtlinie", "verordnung")):
        return True
    return any(term.lower().startswith("eu") or term.lower() in {"richtlinie", "verordnung", "eur-lex"} for term in legal_anchors)
