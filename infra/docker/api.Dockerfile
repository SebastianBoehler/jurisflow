FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY packages/shared /app/packages/shared
COPY packages/db /app/packages/db
COPY packages/parsers /app/packages/parsers
COPY packages/retrieval /app/packages/retrieval
COPY packages/agents /app/packages/agents
COPY apps/api /app/apps/api
COPY .env.example /app/.env.example

RUN python -m pip install --upgrade pip && \
    pip install -e /app/packages/shared \
    -e /app/packages/db \
    -e /app/packages/parsers \
    -e /app/packages/retrieval \
    -e /app/packages/agents \
    -e /app/apps/api

EXPOSE 8000

CMD ["sh", "-c", "alembic -c /app/packages/db/alembic.ini upgrade head && uvicorn jurisflow_api.main:app --host 0.0.0.0 --port 8000"]

