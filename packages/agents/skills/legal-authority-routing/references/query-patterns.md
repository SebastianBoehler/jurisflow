# Query Patterns

Use this file to generate lane-specific primary and refinement queries.

## General rules

- Preserve explicit statute anchors.
- Prefer 1 compact primary query and at most 1 refinement query.
- Make refinement queries materially different from the primary query.
- Keep the lane vocabulary aligned with the target source.

## `federal_law`

Primary pattern:
`<statute anchors or core issue> Bundesrecht Gesetz Paragraph`

Refinement pattern:
`<base issue> <statute anchors or key terms> <major code abbreviations>`

Examples:
- `§ 543 BGB § 569 BGB Bundesrecht Gesetz Paragraph`
- `fristlose Kuendigung Zahlungsverzug § 543 BGB BGB`

## `state_law`

Primary pattern:
`<base issue> <anchors> <hints> Landesrecht Verwaltungsvorschrift Erlass Polizei Ministerium`

Refinement pattern:
`<base issue> <practical terms> Bundesland Richtlinie Vollzugshinweise`

Examples:
- `Blitzer Ortsschild Messstelle VwV-StVO Landesrecht Verwaltungsvorschrift Erlass Polizei Ministerium`
- `Abstandsmessung Bayern Ortsschild Bundesland Richtlinie Vollzugshinweise`

## `case_law`

Primary pattern:
`<base issue> <anchors> <issue terms> Urteil Beschluss BGH OLG OVG VGH`

Refinement pattern:
`<base issue> <anchors or terms> Rechtsprechung <fact-pattern synonyms>`

Examples:
- `fristlose Kuendigung Zahlungsverzug § 543 BGB Urteil Beschluss BGH OLG`
- `Blitzer Ortsschild Messstelle Rechtsprechung Abstandsmessung`

## `eu_law`

Primary pattern:
`<base issue> <anchors> EU-Recht Richtlinie Verordnung`

Refinement pattern:
`<key terms> EUR-Lex`

Examples:
- `DSGVO Schadenersatz EU-Recht Richtlinie Verordnung`
- `Plattformhaftung EUR-Lex`

## `internal_docs`

Primary pattern:
`<base issue>`

Refinement pattern:
Use only if the first internal pass is weak and there are stronger fact or document terms available.

Examples:
- `Zahlungsverzug Abmahnung Kuendigung`
- `Messprotokoll Ortsschild Eichung`

## Required terms

Use `required_terms` for:
- statute sections
- named directives or regulations
- decisive legal concepts
- court or authority names when essential

Do not use `required_terms` for:
- filler words
- broad generic legal vocabulary
- lane labels like `Bundesrecht` or `Rechtsprechung`
