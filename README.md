# Jurisflow

Jurisflow is an early-stage legal AI workspace focused on German legal workflows. It combines a Next.js frontend, a FastAPI backend, asynchronous document and research jobs, and a modular Python package layer for retrieval, parsing, agents, and shared domain types.

The repository is structured as a monorepo so product code, infrastructure, and reusable packages evolve together.

Important: Jurisflow is software for legal operations support. It does not provide legal advice, and outputs should always be reviewed by a qualified human professional.

## What Is In Scope

- Matter-centric legal workspaces
- Document ingestion and extraction
- Research pipelines over public legal sources
- Draft-generation and deadline-support workflows
- Shared backend packages for retrieval, parsing, and data models

## Repository Layout

- `apps/web` - Next.js App Router frontend built with TypeScript and Tailwind CSS
- `apps/api` - FastAPI application exposing the HTTP API
- `apps/worker` - `arq` worker for asynchronous research, document, and drafting jobs
- `packages/agents` - AI workflow orchestration and research logic
- `packages/db` - SQLAlchemy models and Alembic migrations
- `packages/parsers` - document parsing and OCR-related helpers
- `packages/retrieval` - legal-source adapters and retrieval helpers
- `packages/shared` - shared configuration, enums, and schemas
- `infra/docker` - Dockerfiles for local backend services

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- API: FastAPI, SQLAlchemy
- Background jobs: `arq`, Redis
- Database: PostgreSQL with `pgvector`
- Tooling: Bun workspaces for the web layer, `uv`/Python workspace packages for backend services

## Getting Started

### Prerequisites

- Bun `1.x`
- Python `3.11`
- Docker and Docker Compose

### 1. Clone And Configure

```bash
git clone https://github.com/SebastianBoehler/jurisflow.git
cd jurisflow
cp .env.example .env
```

### 2. Start Backend Services

```bash
docker compose up --build
```

This starts:

- PostgreSQL with `pgvector`
- Redis
- FastAPI on `http://localhost:8000`
- Background worker

The API health endpoint is available at `http://localhost:8000/health`.

### 3. Start The Web App

In a second terminal:

```bash
bun install
bun run dev:web
```

The web app runs on `http://localhost:3000`.

## Development Workflow

### Frontend Checks

```bash
bun run lint:web
bun run typecheck:web
```

### Backend Notes

- Docker applies Alembic migrations automatically when the API container starts.
- Runtime configuration is read from environment variables shared across API and worker services.
- AI-provider credentials are optional for wiring the system to live model backends, but local infrastructure boot does not require them.

## Environment Variables

The main configuration lives in `.env.example`. Common variables include:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - OpenAI API key for model-backed features
- `OPENROUTER_API_KEY` - OpenRouter API key if that provider is used
- `OPENAI_MODEL` and `OPENROUTER_MODEL` - default model selection
- `FEDERAL_LAW_API_BASE` and `EURLEX_API_BASE` - public legal data source endpoints

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding expectations, and pull request guidance.

Before opening a pull request:

- keep changes focused
- explain the motivation and user impact
- run the relevant checks for the area you touched
- include screenshots for UI changes

## Security

If you find a security issue, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Community

- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Pull request template: [`.github/pull_request_template.md`](./.github/pull_request_template.md)
- Issue templates: [`.github/ISSUE_TEMPLATE`](./.github/ISSUE_TEMPLATE)

## License

This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE).
