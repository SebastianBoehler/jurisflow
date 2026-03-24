# jurisflow-ai

Germany-first Legal AI platform scaffold for law firms. The repository is a Bun + Python monorepo with a Next.js frontend, FastAPI API, Redis worker, PostgreSQL + pgvector, and modular packages for agents, parsers, retrieval, and database code.

## Stack

- `apps/web`: Next.js App Router, TypeScript, TailwindCSS
- `apps/api`: FastAPI REST API
- `apps/worker`: Redis-backed background worker with `arq`
- `packages/agents`: Google ADK workflow definitions
- `packages/parsers`: file parsing and OCR fallback hooks
- `packages/retrieval`: legal source adapters and retrieval helpers
- `packages/db`: SQLAlchemy models and Alembic migrations
- `packages/shared`: settings, enums, and API schemas shared across Python apps

## Local Boot

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Start backend services:

```bash
docker compose up --build
```

3. Start the web app in a second terminal:

```bash
bun install
bun run dev:web
```

The API starts on `http://localhost:8000` and the web app on `http://localhost:3000`.

## Notes

- The worker includes a PaddleOCR-backed code path, but OCR only runs when a PDF has no text layer.
- The default worker image does not force-install PaddleOCR wheels. That keeps `docker compose up` portable; enabling full OCR is an additive worker-image step once you lock the target runtime.
- OpenRouter-backed ADK agents are optional at runtime. If no API key is present, the system falls back to deterministic mock outputs so local boot still works.
- Public-source research is scaffolded behind adapters for German federal law/case law and EUR-Lex.
