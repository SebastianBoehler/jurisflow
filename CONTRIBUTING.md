# Contributing To Jurisflow

Thanks for contributing. This document keeps contributions consistent, reviewable, and easy to merge.

## Before You Start

- Open an issue first for large changes, architectural shifts, or new product surfaces.
- Keep pull requests narrow. Small, composable changes are easier to review and safer to ship.
- Do not mix unrelated cleanup into a feature branch.

## Local Setup

### Prerequisites

- Bun `1.x`
- Python `3.11`
- Docker and Docker Compose

### Boot The Stack

```bash
cp .env.example .env
docker compose up --build
```

In another terminal:

```bash
bun install
bun run dev:web
```

## Project Conventions

- Prefer small modules. Files that drift much beyond 300 lines should usually be split.
- Keep interfaces and domain types close to their owning package, not duplicated across layers.
- Avoid duplication. If the same logic appears twice, extract it.
- Do not add mock data, silent fallbacks, or alternate happy paths unless there is an explicit product decision for them.
- Prefer explicit errors over hidden recovery behavior.
- Preserve existing patterns unless there is a strong reason to improve them consistently.

## Branching

- Use descriptive branch names such as `feat/research-trace-panel` or `fix/api-matter-validation`.
- Keep one branch focused on one change set.

## Pull Requests

Every pull request should include:

- a clear problem statement
- a concise summary of the change
- screenshots or recordings for UI work
- notes on any follow-up work
- the checks you ran locally

Use the pull request template and fill it out properly.

## Suggested Checks

### Frontend

```bash
bun run lint:web
bun run typecheck:web
```

### Backend

Run the relevant service locally through Docker and verify the changed path end to end. If you change schema or persistence behavior, confirm migrations and application boot.

## Commit Style

Use clear conventional-style commit messages where possible:

- `feat: add research result citations`
- `fix(api): validate missing tenant id`
- `docs: clarify local setup`
- `chore: simplify docker boot`

## Review Expectations

- reviewers should be able to understand the why in under a minute
- each PR should be reversible without collateral damage
- unresolved questions should be called out directly in the PR body

## Reporting Security Issues

Do not file public issues for vulnerabilities. Follow [SECURITY.md](./SECURITY.md).
