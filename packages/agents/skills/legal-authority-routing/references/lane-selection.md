# Lane Selection

Use this file when deciding whether a lane should be active or skipped.

## Default stance

- Start narrow.
- Activate only lanes that can plausibly return controlling or persuasive authority.
- Treat lane activation as a hypothesis that must be justified by facts, anchors, or jurisdiction clues.

## `federal_law`

Activate when:
- the question references named federal statutes or sections
- the issue usually turns on codified national rules
- no clear state-only or EU-only hook dominates

Common indicators:
- `§`
- `BGB`
- `StVG`
- `StVO`
- `ZPO`
- `StPO`
- `SGB`

Usually skip when:
- the issue is purely administrative practice at Land level
- the question is mainly about court treatment rather than black-letter law

## `state_law`

Activate when:
- the issue depends on Land implementation
- the matter concerns police, ministerial guidance, execution decrees, or administrative directives
- traffic enforcement or practical administrative handling matters more than the federal text alone

Strong indicators:
- `Verwaltungsvorschrift`
- `Erlass`
- `Vollzugshinweise`
- `Polizei`
- `Ministerium`
- `Landesrecht`
- place-specific enforcement practice

Usually skip when:
- the issue is pure civil law
- only federal statutory interpretation is needed

## `case_law`

Activate when:
- the answer likely depends on interpretation, balancing, or thresholds
- the user asks whether a position is arguable, defensible, accepted, or likely to succeed
- the fact pattern matters as much as the statute text

Strong indicators:
- `Urteil`
- `Beschluss`
- `BGH`
- `OLG`
- `OVG`
- `VGH`
- phrases like `wie beurteilen Gerichte`

Usually skip only when:
- the task is simple statute lookup with no interpretive uncertainty

## `eu_law`

Activate when:
- the matter has a genuine EU connection
- a directive or regulation may control or shape national interpretation
- EUR-Lex material is likely to be authoritative

Strong indicators:
- `EU`
- `Richtlinie`
- `Verordnung`
- `EUR-Lex`
- internal-market, consumer, privacy, competition, procurement context

Usually skip when:
- the issue is ordinary domestic civil or criminal law with no EU hook

## `internal_docs`

Activate when:
- matter files may contain decisive facts
- prior submissions, notices, contracts, or correspondence may change routing or framing
- the task is matter-specific instead of purely generic legal research

Usually skip when:
- the user asks a general legal question with no matter context

## Practical combinations

Common pairings:
- `federal_law` + `case_law`
- `state_law` + `case_law`
- `federal_law` + `internal_docs`

Less common pairings:
- `eu_law` + `state_law`

Do not activate all lanes by default.
