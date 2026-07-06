from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_frontend_origins
from app.routes.health import router as health_router
from app.routes.tickets import router as tickets_router
from app.routes.triage import router as triage_router
from app.organizations.routes import router as organizations_router
from app.integrations.slack.routes.oauth import router as slack_router
from app.integrations.slack.routes.webhooks import router as slack_webhook_router
from app.redis.client import close_redis_client
from app.redis.arq_pool import close_arq_pool


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_arq_pool()
    await close_redis_client()


app = FastAPI(
    title="AI Ticket Management API",
    description="Webhook gateway and ticket API for the AI-driven Kanban dashboard.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_frontend_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
    ],
)

app.include_router(health_router)
app.include_router(triage_router)
app.include_router(tickets_router)
app.include_router(organizations_router)
app.include_router(slack_router)
app.include_router(slack_webhook_router)
