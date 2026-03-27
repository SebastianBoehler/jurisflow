---
name: legal-authority-routing
description: Route legal research tasks into source-specific authority lanes and generate targeted queries for statutes, case law, EU law, state law, and internal matter records. Use when Codex needs to decide which legal sources to search, which lanes to skip, and how to phrase lane-specific search queries for German legal workflows, especially before research execution, follow-up search planning, or drafting support.
---

# Legal Authority Routing

Convert an unstructured legal question into an executable lane plan for German legal research.

Prefer this skill when the main problem is source selection and query design, not final legal analysis.

## Workflow

1. Normalize the request.
Extract the core question, optional focus, likely jurisdiction, and any explicit statute or court references.

2. Select lanes.
Choose only the lanes that can realistically produce authority:
- `federal_law`
- `state_law`
- `case_law`
- `eu_law`
- `internal_docs`

Read [references/lane-selection.md](./references/lane-selection.md) when the source choice is ambiguous.

3. Generate lane-specific queries.
Produce one primary query per chosen lane and one refinement query only when a second pass is likely to help. Read [references/query-patterns.md](./references/query-patterns.md) for lane templates.

4. Keep the plan sparse.
Do not activate lanes just because they exist. Skip lanes that do not fit the issue. Prefer fewer, sharper searches over broad parallel noise.

5. Return a structured routing result.
Shape the output as:
- `objective`
- `search_strategy`
- `legal_anchors`
- `jurisdiction_hints`
- `key_issues`
- `source_routes[]` with `source`, `rationale`, `primary_query`, optional `refinement_query`, and `required_terms`

## Routing Rules

- Prefer `federal_law` when the issue is anchored in federal statutes, federal regulations, or named sections.
- Prefer `state_law` only when the issue depends on administrative practice, police guidance, ministerial directives, execution guidance, or other state-specific implementation material.
- Prefer `case_law` for interpretation disputes, balancing tests, procedural posture, or when the question asks how courts treat a fact pattern.
- Prefer `eu_law` only when the question has a real EU hook such as regulation, directive, CELEX material, internal-market, consumer, data, or competition context.
- Prefer `internal_docs` when matter files, uploaded evidence, prior submissions, or tenant-local records could change the answer materially.
- Do not use generic web search as a substitute for an authority lane unless the calling workflow explicitly asks for reconnaissance.

## Query Design Rules

- Preserve statute anchors verbatim when present.
- Keep primary queries compact and authority-seeking.
- Use refinement queries to add missing terminology, court names, or practical synonyms.
- Do not generate duplicate primary and refinement queries.
- Do not widen a lane with filler words.
- Include only the terms that improve recall for that lane.

## Output Quality Bar

- Every selected lane must have a reason tied to the facts or legal issue.
- Every skipped lane should be skippable on first-principles grounds.
- Queries must be different across lanes; each lane should reflect its source type.
- `required_terms` should contain only anchors that must survive later rewrites.
- If the problem is under-specified, still return the best narrow route plan instead of expanding every lane defensively.

## Examples

User request:
`Pruefe fristlose Kuendigung wegen Zahlungsverzug bei Wohnraummiete.`

Good routing characteristics:
- activate `federal_law`
- activate `case_law`
- likely skip `state_law`
- likely skip `eu_law`
- activate `internal_docs` only if matter facts or notices are available

User request:
`Ist der Blitzer kurz hinter dem Ortsschild in Bayern angreifbar?`

Good routing characteristics:
- activate `state_law`
- activate `case_law`
- activate `federal_law` if StVO anchors appear
- skip `eu_law`

## Notes For Jurisflow

- Align lane names and output fields with the existing research plan model in `packages/agents/src/jurisflow_agents/research_router_types.py`.
- Align lane choice with the current research flow: reconnaissance, router, parallel source search, gap analysis, rerank, synthesis.
- Keep this skill focused on routing. Execution, retrieval, reranking, and memo writing belong elsewhere.
