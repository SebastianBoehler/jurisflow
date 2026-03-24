from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from jurisflow_api.routers import deadlines, documents, drafts, health, matters, research
from jurisflow_shared import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_settings()
    yield


app = FastAPI(title="Jurisflow API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(matters.router)
app.include_router(documents.router)
app.include_router(deadlines.router)
app.include_router(research.router)
app.include_router(drafts.router)
