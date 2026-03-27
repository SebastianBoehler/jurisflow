import json
from functools import lru_cache
from urllib.parse import urlparse
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from jurisflow_agents.chat_agent import run_chat, stream_chat
from jurisflow_api.deps import get_actor_id, get_db_session, get_tenant_id
from jurisflow_api.queue import enqueue_job
from jurisflow_api.services import research as research_service
from jurisflow_shared import ResearchRequest, ResearchResultRead, ResearchRunRead

router = APIRouter(tags=["research"])


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    query: str
    history: list[ChatTurn] = []


class ChatReply(BaseModel):
    answer: str

# Domains for which citation URL verification is allowed.
# Restricting this prevents the endpoint from being used as an open proxy.
_ALLOWED_VERIFY_DOMAINS = frozenset(
    {
        "gesetze-im-internet.de",
        "rechtsprechung-im-internet.de",
        "eur-lex.europa.eu",
        "openjur.de",
        "dejure.org",
        "buzer.de",
        "rewis.io",
        "bverfg.de",
        "bundesgerichtshof.de",
        "bverwg.de",
        "bag.bund.de",
        "bfh.bund.de",
        "bsg.bund.de",
    }
)


class CitationVerifyResult(BaseModel):
    url: str
    verified: bool
    status_code: int | None = None
    error: str | None = None


@lru_cache(maxsize=512)
def _cached_verify(url: str) -> CitationVerifyResult:
    """Synchronous HEAD check, result cached in-process (process restart clears cache)."""
    try:
        with httpx.Client(follow_redirects=True, timeout=8.0) as client:
            resp = client.head(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Jurisflow/1.0)"})
            return CitationVerifyResult(url=url, verified=resp.status_code == 200, status_code=resp.status_code)
    except Exception as exc:
        return CitationVerifyResult(url=url, verified=False, error=str(exc)[:200])


@router.post("/v1/matters/{matter_id}/research", response_model=ResearchRunRead, status_code=status.HTTP_202_ACCEPTED)
async def start_research(
    matter_id: UUID,
    payload: ResearchRequest,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    actor_id: UUID | None = Depends(get_actor_id),
) -> ResearchRunRead:
    try:
        run = research_service.create_research_run(
            session,
            tenant_id=tenant_id,
            actor_id=actor_id,
            matter_id=matter_id,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    await enqueue_job("run_research", str(run.id), str(tenant_id), payload.model_dump_json())
    return ResearchRunRead.model_validate(run)


@router.post("/v1/matters/{matter_id}/chat", response_model=ChatReply)
async def quick_chat(
    matter_id: UUID,
    payload: ChatRequest,
    tenant_id: UUID = Depends(get_tenant_id),
) -> ChatReply:
    """ADK LlmAgent chat with optional web-search tool.

    Runs the JurisflowChatAgent via Google ADK + LiteLLM (OpenRouter/OpenAI).
    The agent decides autonomously whether to call web_search for each query.
    """
    try:
        answer = await run_chat(
            payload.query,
            [{"role": t.role, "content": t.content} for t in payload.history],
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)[:400]) from exc
    return ChatReply(answer=answer)


@router.post("/v1/matters/{matter_id}/chat/stream")
async def stream_chat_endpoint(
    matter_id: UUID,
    payload: ChatRequest,
    tenant_id: UUID = Depends(get_tenant_id),
) -> StreamingResponse:
    """SSE stream of chat agent events (text deltas, tool calls, tool results)."""
    async def event_gen():
        try:
            async for event in stream_chat(
                payload.query,
                [{"role": t.role, "content": t.content} for t in payload.history],
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)[:200]}, ensure_ascii=False)}\n\n"
            yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/v1/matters/{matter_id}/research", response_model=list[ResearchRunRead])
def list_research_runs(
    matter_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[ResearchRunRead]:
    runs = research_service.list_research_runs(session, tenant_id, matter_id)
    return [ResearchRunRead.model_validate(run) for run in runs]


@router.get("/v1/citations/verify", response_model=CitationVerifyResult, tags=["citations"])
def verify_citation(
    url: str = Query(..., description="Citation URL to verify (must be from an allowed legal domain)"),
) -> CitationVerifyResult:
    """HEAD-check a citation URL and return whether it resolves to an existing page.

    Only URLs from trusted German/EU legal portals are accepted.  Results are
    cached in-process for the lifetime of the API server so repeated calls for
    the same URL are free.
    """
    parsed = urlparse(url)
    host = parsed.netloc.lower().replace("www.", "")
    if not parsed.scheme.startswith("http"):
        raise HTTPException(status_code=400, detail="URL must use http or https.")
    if not any(host == d or host.endswith(f".{d}") for d in _ALLOWED_VERIFY_DOMAINS):
        raise HTTPException(
            status_code=400,
            detail=f"Domain '{host}' is not in the allowlist for citation verification.",
        )
    return _cached_verify(url)


@router.get("/v1/research/{research_run_id}/results", response_model=list[ResearchResultRead])
def list_research_results(
    research_run_id: UUID,
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> list[ResearchResultRead]:
    try:
        results = research_service.list_research_results(session, tenant_id, research_run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [ResearchResultRead.model_validate(result) for result in results]
