from jurisflow_agents.research_llm_types import ResearchGapAnalysis, ResearchPlan
from jurisflow_agents.research_reconnaissance import derive_reconnaissance_hints
from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_retrieval import extract_statute_references
from jurisflow_shared import ResearchSource

SOURCE_LABELS = {
    ResearchSource.FEDERAL_LAW: "Bundesrecht",
    ResearchSource.STATE_LAW: "Landesrecht",
    ResearchSource.CASE_LAW: "Rechtsprechung",
    ResearchSource.EU_LAW: "EU-Recht",
    ResearchSource.INTERNAL_DOCS: "Interne Dokumente",
    ResearchSource.GENERAL_WEB: "Web-Recherche",
}


def _reconnaissance_hints(state: ResearchWorkflowState) -> str:
    return " ".join(derive_reconnaissance_hints(state.reconnaissance_hits)).strip()


def fallback_plan(state: ResearchWorkflowState) -> ResearchPlan:
    base_query = state.payload.request.query.strip()
    focus = (state.payload.request.focus or "").strip()
    statutes = extract_statute_references(f"{base_query} {focus}".strip())
    reconnaissance_hints = _reconnaissance_hints(state)
    tasks = []
    for source in state.enabled_sources:
        tasks.append(
            {
                "source": source,
                "query": build_source_query(source, base_query, focus, statutes, reconnaissance_hints),
                "rationale": f"Deckung fuer {SOURCE_LABELS[source]}.",
                "priority": 1,
            }
        )
    return ResearchPlan.model_validate(
        {
            "objective": state.payload.request.query,
            "search_strategy": "Quelle fuer Quelle parallel recherchieren und anschliessend konsolidieren.",
            "key_terms": statutes,
            "tasks": tasks,
        }
    )


def fallback_gap_analysis(state: ResearchWorkflowState) -> ResearchGapAnalysis:
    if len(state.merged_results) >= max(3, state.payload.request.max_results // 2):
        return ResearchGapAnalysis(sufficient_coverage=True)
    statutes = extract_statute_references(f"{state.payload.request.query} {state.payload.request.focus or ''}".strip())
    reconnaissance_hints = _reconnaissance_hints(state)
    follow_up_tasks = []
    for source in state.enabled_sources:
        if state.source_results.get(source):
            continue
        follow_up_tasks.append(
            {
                "source": source,
                "query": build_source_query(source, state.payload.request.query, state.payload.request.focus or "", statutes, reconnaissance_hints),
                "rationale": f"Zweite Runde fuer {SOURCE_LABELS[source]} mangels Treffer.",
                "priority": 2,
            }
        )
    return ResearchGapAnalysis.model_validate(
        {"sufficient_coverage": not follow_up_tasks, "missing_angles": ["Trefferdichte ist noch duenn."], "follow_up_tasks": follow_up_tasks}
    )


def tasks_to_queries(tasks, enabled_sources: list[ResearchSource]) -> dict[ResearchSource, list[str]]:
    pending = {source: [] for source in enabled_sources}
    for task in tasks:
        if task.source not in pending or task.query in pending[task.source]:
            continue
        pending[task.source].append(task.query)
    return pending


def merge_query_sets(*query_sets: dict[ResearchSource, list[str]]) -> dict[ResearchSource, list[str]]:
    merged: dict[ResearchSource, list[str]] = {}
    for query_set in query_sets:
        for source, queries in query_set.items():
            bucket = merged.setdefault(source, [])
            for query in queries:
                if query and query not in bucket:
                    bucket.append(query)
    return merged


def tokenize(text: str) -> set[str]:
    return {token for token in "".join(char.lower() if char.isalnum() else " " for char in text).split() if len(token) > 2}


def score_internal_chunk(content: str, keywords: str, query_tokens: set[str]) -> float:
    overlap = query_tokens & (tokenize(content) | tokenize(keywords))
    if not overlap:
        return 0.0
    statute_bonus = 0.22 if extract_statute_references(content) else 0.0
    return min(0.95, 0.24 + len(overlap) * 0.1 + statute_bonus)


def build_source_query(source: ResearchSource, query: str, focus: str, statutes: list[str], reconnaissance_hints: str = "") -> str:
    query = " ".join(query.split()).strip()
    focus = " ".join(focus.split()).strip()
    statute_terms = " ".join(statutes[:2]).strip()
    hints = " ".join(reconnaissance_hints.split()[:6]).strip()
    if source is ResearchSource.FEDERAL_LAW:
        return " ".join(part for part in [query, focus, statute_terms, hints, "Gesetz Verordnung Verwaltungsvorschrift"] if part).strip()
    if source is ResearchSource.STATE_LAW:
        return " ".join(
            part for part in [query, focus, statute_terms, hints, "Landesrecht Verwaltungsvorschrift Erlass Vollzugshinweise"] if part
        ).strip()
    if source is ResearchSource.CASE_LAW:
        return " ".join(part for part in [query, focus, statute_terms, hints, "Urteil Beschluss OLG BGH VGH OVG"] if part).strip()
    if source is ResearchSource.EU_LAW:
        return " ".join(part for part in [query, focus, "EU-Recht Verordnung Richtlinie"] if part).strip()
    if source is ResearchSource.GENERAL_WEB:
        return " ".join(part for part in [query, focus, "Deutschland"] if part).strip()
    return " ".join(part for part in [query, focus] if part).strip()


def significant_terms(text: str) -> list[str]:
    stopwords = {
        "nach",
        "und",
        "wegen",
        "bei",
        "mit",
        "oder",
        "der",
        "die",
        "das",
        "den",
        "dem",
        "des",
        "einer",
        "eines",
        "behaupteter",
    }
    terms: list[str] = []
    for token in tokenize(text):
        if token in stopwords:
            continue
        terms.append(token)
    return sorted(terms, key=len, reverse=True)
