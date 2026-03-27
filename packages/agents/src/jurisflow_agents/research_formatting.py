"""Formatting helpers: workflow state → human-readable text and Markdown artifacts."""
from __future__ import annotations

from jurisflow_agents.research_llm_types import ResearchMemo
from jurisflow_agents.research_support import SOURCE_LABELS
from jurisflow_agents.research_types import ResearchWorkflowState


def format_summary(state: ResearchWorkflowState, memo: ResearchMemo | None) -> str:
    if memo is not None:
        return memo.executive_summary
    return build_deterministic_answer(state)


def build_deterministic_answer(state: ResearchWorkflowState) -> str:
    if not state.merged_results:
        return "Keine belastbaren Treffer gefunden. Bitte Suchanfrage, Quellenfilter oder Modellkonfiguration pruefen."
    top = state.merged_results[:6]
    parts = []
    for index, hit in enumerate(top, start=1):
        raw = hit.excerpt.replace("\n", " ").strip()
        clean = " ".join(
            seg for seg in raw.split(". ")
            if seg and not seg.lstrip().startswith("|") and len(seg) > 12
        ).strip()
        if not clean:
            clean = raw[:200]
        parts.append(f"**[S{index}]** {clean[:220].rstrip('.')}.")
    intro = f"Die Recherche hat {len(state.merged_results)} Fundstellen identifiziert."
    return intro + " " + " ".join(parts)


def format_plan_artifact(plan) -> str:
    lines = [f"# {plan.objective}", "", plan.search_strategy, ""]
    if getattr(plan, "legal_anchors", None):
        lines.append("## Vermutete Anker")
        lines.extend(f"- {anchor}" for anchor in plan.legal_anchors)
        lines.append("")
    for route in plan.source_routes:
        lines.append(f"- [{route.source.value}] {route.primary_query}")
        lines.append(f"  - {route.rationale}")
        if route.refinement_query:
            lines.append(f"  - Verfeinerung: {route.refinement_query}")
    return "\n".join(lines)


def format_gap_artifact(analysis) -> str:
    lines = ["# Gap-Analyse", ""]
    if analysis.sufficient_coverage:
        lines.append("Die Recherche deckt die Kernfragen bereits belastbar ab.")
        return "\n".join(lines)
    if analysis.missing_angles:
        lines.append("## Offene Blickwinkel")
        lines.extend(f"- {item}" for item in analysis.missing_angles)
        lines.append("")
    if analysis.follow_up_tasks:
        lines.append("## Folgeaufgaben")
        lines.extend(f"- [{task.source.value}] {task.query}" for task in analysis.follow_up_tasks)
    return "\n".join(lines)


def format_memo_artifact(state: ResearchWorkflowState, memo: ResearchMemo | None) -> str:
    """Compact memo — findings and open questions only (no summary duplication)."""
    lines = ["# Research Memo", ""]
    if memo is not None:
        if memo.findings:
            lines.append("## Kernergebnisse")
            lines.extend(f"- **{f.title}**: {f.analysis}" for f in memo.findings)
            lines.append("")
        if memo.open_questions:
            lines.append("## Offene Fragen")
            lines.extend(f"- {q}" for q in memo.open_questions)
            lines.append("")
        if memo.recommended_next_steps:
            lines.append("## Naechste Schritte")
            lines.extend(f"- {s}" for s in memo.recommended_next_steps)
    else:
        lines.append("Kein LLM-Memo verfuegbar (deterministischer Modus).")
    return "\n".join(lines)


def format_report_artifact(state: ResearchWorkflowState, memo: ResearchMemo | None) -> str:
    """Full downloadable report shown in the collapsible details section."""
    lines = ["# Juristische Einordnung", ""]
    lines.append(f"**Anfrage:** {state.payload.request.query}")
    if state.payload.request.focus:
        lines.append(f"**Fokus:** {state.payload.request.focus}")
    lines.append("")
    lines.append(memo.executive_summary if memo is not None else state.summary)
    lines.append("")

    if memo is not None:
        lines.append("## Rechtlicher Rahmen")
        lines.append(memo.legal_framework)
        lines.append("")
        lines.append("## Tatsaechliche Stuetzen")
        lines.append(memo.factual_support)
        lines.append("")
        if memo.findings:
            lines.append("## Kernergebnisse")
            for finding in memo.findings:
                refs = _match_source_refs(state, finding.authorities)
                suffix = f" [{', '.join(refs)}]" if refs else ""
                lines.append(f"### {finding.title}")
                lines.append(f"{finding.analysis}{suffix}")
                lines.append("")
        if memo.open_questions:
            lines.append("## Offene Fragen")
            lines.extend(f"- {q}" for q in memo.open_questions)
            lines.append("")
        if memo.recommended_next_steps:
            lines.append("## Naechste Schritte")
            lines.extend(f"- {s}" for s in memo.recommended_next_steps)
            lines.append("")

    lines.append("## Quellen")
    for index, hit in enumerate(state.merged_results, start=1):
        citation = f" — {hit.citation}" if hit.citation else ""
        url_part = f" <{hit.url}>" if hit.url else ""
        lines.append(f"[S{index}] {hit.title}{citation} · {SOURCE_LABELS[hit.source]}{url_part}")
    return "\n".join(lines)


def _match_source_refs(state: ResearchWorkflowState, authorities: list[str]) -> list[str]:
    refs: list[str] = []
    for index, hit in enumerate(state.merged_results, start=1):
        haystacks = [hit.title.lower(), (hit.citation or "").lower()]
        if any(authority.lower() in " ".join(haystacks) for authority in authorities):
            refs.append(f"[S{index}]")
    return refs[:4]
