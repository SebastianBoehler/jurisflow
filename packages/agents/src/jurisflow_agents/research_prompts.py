from jurisflow_agents.research_types import ResearchWorkflowState
from jurisflow_shared import ResearchSource


SOURCE_DESCRIPTIONS = {
    ResearchSource.FEDERAL_LAW: "Deutsches Bundesrecht ueber Gesetze im Internet",
    ResearchSource.CASE_LAW: "Bundesgerichte ueber Rechtsprechung im Internet",
    ResearchSource.EU_LAW: "EU-Recht ueber EUR-Lex",
    ResearchSource.INTERNAL_DOCS: "hochgeladene Akteninhalte der konkreten Sache",
}


def planner_system_prompt() -> str:
    return (
        "Du bist ein deutscher Legal-Research-Strategist fuer Wirtschaftskanzleien. "
        "Plane nur Suchschritte, keine Halluzinationen. "
        "Nutze die verfuegbaren Quellen gezielt und formuliere kurze, praezise Suchanfragen."
    )


def planner_user_prompt(query: str, focus: str | None, sources: list[ResearchSource], max_results: int) -> str:
    enabled_sources = "\n".join(f"- {source.value}: {SOURCE_DESCRIPTIONS[source]}" for source in sources)
    focus_text = focus or "Kein gesonderter Fokus."
    return (
        "Erstelle einen Deep-Research-Plan fuer eine juristische Recherche.\n\n"
        f"Anfrage: {query}\n"
        f"Fokus: {focus_text}\n"
        f"Maximale Gesamttreffer: {max_results}\n"
        "Verfuegbare Quellen:\n"
        f"{enabled_sources}\n\n"
        "Anforderungen:\n"
        "- Plane mehrere parallele Suchanfragen fuer unterschiedliche Quellen.\n"
        "- Priorisiere Anspruchsgrundlagen, Einwendungen, Fristen und beweisrelevante Fundstellen.\n"
        "- Nutze interne Dokumente nur, wenn sie als Quelle verfuegbar sind.\n"
        "- Gib nur Suchaufgaben fuer die verfuegbaren Quellen aus."
    )


def gap_system_prompt() -> str:
    return (
        "Du bist ein Research-Reviewer fuer deutsche Rechtsrecherche. "
        "Bewerte Deckungsluecken konservativ und plane nur dann Folgeabfragen, wenn sie den Erkenntnisgewinn klar verbessern."
    )


def gap_user_prompt(state: ResearchWorkflowState) -> str:
    return (
        "Pruefe, ob nach der ersten Suchrunde weitere Recherche noetig ist.\n\n"
        f"Ausgangsanfrage: {state.payload.request.query}\n"
        f"Fokus: {state.payload.request.focus or 'Kein gesonderter Fokus'}\n"
        f"Zwischensummary: {summarize_hits_for_llm(state)}\n\n"
        "Anforderungen:\n"
        "- Wenn die Trefferlage bereits tragfaehig ist, setze sufficient_coverage auf true.\n"
        "- Wenn Luecken bestehen, formuliere nur wenige, gezielte Folgeabfragen.\n"
        "- Keine erfundenen Fundstellen."
    )


def synthesis_system_prompt() -> str:
    return (
        "Du bist ein deutscher Legal-Research-Syntheseagent. "
        "Formuliere praezise, nuechtern und anwaltlich belastbar. "
        "Ziehe nur Schluesse aus den bereitgestellten Treffern."
    )


def synthesis_user_prompt(state: ResearchWorkflowState) -> str:
    return (
        "Fasse die Recherche fuer eine deutsche Kanzlei zusammen.\n\n"
        f"Anfrage: {state.payload.request.query}\n"
        f"Fokus: {state.payload.request.focus or 'Kein gesonderter Fokus'}\n"
        f"Quellenmodus: {'Live-LLM' if state.used_live_llm else 'Fallback'}\n"
        "Trefferbasis:\n"
        f"{summarize_hits_for_llm(state, per_source_limit=4)}\n\n"
        "Anforderungen:\n"
        "- Stelle Anspruchsgrundlagen, Einwendungen und Belegstellen heraus.\n"
        "- Benenne offene Risiken und Beweis-/Rechercheluecken.\n"
        "- Verweise in authorities nur auf bereitgestellte Zitate oder Titel."
    )


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
