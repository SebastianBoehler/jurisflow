FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev libglib2.0-0 libsm6 libxrender1 libxext6 && rm -rf /var/lib/apt/lists/*

COPY packages/shared /app/packages/shared
COPY packages/db /app/packages/db
COPY packages/parsers /app/packages/parsers
COPY packages/retrieval /app/packages/retrieval
COPY packages/agents /app/packages/agents
COPY apps/worker /app/apps/worker

RUN python -m pip install --upgrade pip && \
    pip install -e /app/packages/shared \
    -e /app/packages/db \
    -e /app/packages/retrieval \
    -e /app/packages/agents \
    -e /app/packages/parsers \
    -e /app/apps/worker

CMD ["arq", "jurisflow_worker.settings.WorkerSettings"]
