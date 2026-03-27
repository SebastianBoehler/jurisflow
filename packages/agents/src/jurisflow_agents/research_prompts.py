from jurisflow_agents.research_router_types import ResearchRoutePlan
from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_shared import ResearchSource


SOURCE_DESCRIPTIONS = {
    ResearchSource.FEDERAL_LAW: "Deutsches Bundesrecht ueber Gesetze im Internet",
    ResearchSource.STATE_LAW: "Landesrecht, Verwaltungsvorschriften und ministerielle Vollzugshinweise",
    ResearchSource.CASE_LAW: "Bundesgerichte ueber Rechtsprechung im Internet",
    ResearchSource.EU_LAW: "EU-Recht ueber EUR-Lex",
    ResearchSource.INTERNAL_DOCS: "hochgeladene Akteninhalte der konkreten Sache",
    ResearchSource.GENERAL_WEB: "Web-Recherche zur Orientierung und Themenidentifikation",
}


def planner_system_prompt() -> str:
    return (
        "Du bist ein deutscher Legal-Research-Router fuer Wirtschaftskanzleien. "
        "Leite wahrscheinliche Normen, Zustaendigkeiten und Suchpfade konservativ ab. "
        "Erfinde keine Fundstellen, aber nenne plausible Suchanker fuer die Recherche. "
        "Formuliere pro Quelle kurze, praezise Suchanfragen und optional eine gezielte Verfeinerung."
    )


def planner_user_prompt(
    query: str,
    focus: str | None,
    sources: list[ResearchSource],
    max_results: int,
    conversation_transcript: str | None = None,
    reconnaissance_summary: str | None = None,
) -> str:
    enabled_sources = "\n".join(f"- {source.value}: {SOURCE_DESCRIPTIONS[source]}" for source in sources)
    focus_text = focus or "Kein gesonderter Fokus."
    reconnaissance_text = reconnaissance_summary or "Keine vorgelagerte Web-Recherche vorhanden."
    conversation_text = conversation_transcript or "Kein bisheriger Gespraechsverlauf vorhanden."
    return (
        "Erstelle einen Deep-Research-Plan fuer eine juristische Recherche.\n\n"
        f"Anfrage: {query}\n"
        f"Fokus: {focus_text}\n"
        f"Maximale Gesamttreffer: {max_results}\n"
        "Bisheriger Gespraechsverlauf:\n"
        f"{conversation_text}\n\n"
        "Web-Recherche zur Orientierung:\n"
        f"{reconnaissance_text}\n\n"
        "Verfuegbare Quellen:\n"
        f"{enabled_sources}\n\n"
        "Anforderungen:\n"
        "- Nutze die Web-Recherche nur als Hinweisgeber fuer einschlaegige Normen, Stellen und Suchbegriffe.\n"
        "- Gib fuer jede passende Quelle einen source_route aus.\n"
        "- Jede Quelle soll eine primary_query erhalten und nur wenn sinnvoll eine refinement_query.\n"
        "- Priorisiere primaere Normen, einschlaegige Rechtsprechung, Verwaltungsvorschriften, technische Vorgaben und beweisrelevante Fundstellen.\n"
        "- Verwende Begriffe wie Anspruchsgrundlagen oder Einwendungen nur, wenn sie zur konkreten Anfrage passen.\n"
        "- Interne Dokumente nur, wenn sie als Quelle verfuegbar sind.\n"
        "- Gib nur Suchpfade fuer die verfuegbaren Quellen aus."
    )


def planner_response_model() -> type[ResearchRoutePlan]:
    return ResearchRoutePlan


def gap_system_prompt() -> str:
    return (
        "Du bist ein Research-Reviewer fuer deutsche Rechtsrecherche. "
        "Bewerte Deckungsluecken konservativ und plane nur dann Folgeabfragen, wenn sie den Erkenntnisgewinn klar verbessern."
    )


def gap_user_prompt(state: ResearchWorkflowState) -> str:
    return (
        "Pruefe, ob nach der ersten Suchrunde weitere Recherche noetig ist.\n\n"
        f"Ausgangsanfrage: {state.payload.request.query}\n"
        f"Kontext aus dem bisherigen Gespraech:\n{state.conversation_transcript or 'Kein bisheriger Gespraechsverlauf'}\n\n"
        f"Fokus: {state.payload.request.focus or 'Kein gesonderter Fokus'}\n"
        f"Zwischensummary: {summarize_hits_for_llm(state)}\n\n"
        "Anforderungen:\n"
        "- Wenn die Trefferlage bereits tragfaehig ist, setze sufficient_coverage auf true.\n"
        "- Wenn Luecken bestehen, formuliere nur wenige, gezielte Folgeabfragen.\n"
        "- Keine erfundenen Fundstellen."
    )


def synthesis_system_prompt() -> str:
    return (
        "Du bist ein deutscher Legal-Research-Syntheseagent fuer eine Wirtschaftskanzlei. "
        "Formuliere praezise, nuechtern und anwaltlich belastbar. "
        "Ziehe nur Schluesse aus den bereitgestellten Treffern. "
        "Belege jede Aussage mit der zugehoerigen Quellenreferenz [S1], [S2] etc. direkt im Fliesstext – "
        "nach dem Satz, der sich auf die Quelle stuetzt. "
        "Erfinde keine Fundstellen, Normen oder Zitate."
    )


def synthesis_user_prompt(state: ResearchWorkflowState) -> str:
    source_index = _build_source_index(state)
    return (
        "Fasse die Recherche fuer eine deutsche Kanzlei zusammen.\n\n"
        f"Anfrage: {state.payload.request.query}\n"
        f"Gespraechsverlauf:\n{state.conversation_transcript or 'Kein bisheriger Gespraechsverlauf'}\n\n"
        f"Fokus: {state.payload.request.focus or 'Kein gesonderter Fokus'}\n\n"
        "QUELLENINDEX – verwende diese Referenzen inline im Text:\n"
        f"{source_index}\n\n"
        "Trefferbasis (Volltext):\n"
        f"{summarize_hits_for_llm(state, per_source_limit=4)}\n\n"
        "Anforderungen:\n"
        "- Stelle die relevanten Normen, Vorgaben, Einwendungen und Belegstellen heraus.\n"
        "- Zitiere nach jeder relevanten Aussage die Quelle als [S1], [S2] etc. inline.\n"
        "- Verweise in 'authorities' nur auf Zitate und Titel aus dem Quellenindex.\n"
        "- Benenne offene Risiken und Recherche-/Beweisluecken.\n"
        "- Keine erfundenen Fundstellen."
    )


def _build_source_index(state: ResearchWorkflowState) -> str:
    """Build a numbered source index for the synthesis prompt."""
    lines: list[str] = []
    for index, hit in enumerate(state.merged_results, start=1):
        citation = hit.citation or hit.title
        source_label = SOURCE_DESCRIPTIONS.get(hit.source, hit.source.value)
        url_hint = f" | {hit.url}" if hit.url else ""
        lines.append(f"[S{index}] {source_label}: {citation}{url_hint}")
    return "\n".join(lines) if lines else "Keine Treffer vorhanden."


def summarize_hits_for_llm(state: ResearchWorkflowState, per_source_limit: int = 3) -> str:
    lines: list[str] = []
    for source in state.enabled_sources:
        hits = state.source_results.get(source, [])[:per_source_limit]
        if not hits:
            error = state.source_errors.get(source)
            lines.append(f"{source.value}: keine Treffer{f' ({error})' if error else ''}")
            continue
        for index, hit in enumerate(hits, start=1):
            citation = f" | Zitat: {hit.citation}" if hit.citation else ""
            excerpt = hit.excerpt.replace("\n", " ").strip()
            lines.append(f"{source.value} #{index}: {hit.title}{citation} | {excerpt[:400]}")
    return "\n".join(lines)
