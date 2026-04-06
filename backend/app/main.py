from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import dispose_engine
from app.routers import (
    activity_log,
    auth,
    companies,
    filters,
    jobs,
    kanban_stages,
    linkedin_searches,
    settings as settings_router,
    tasks,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    # Startup
    yield
    # Shutdown
    await dispose_engine()


app = FastAPI(
    title="Hunty API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(filters.router, prefix="/api")
app.include_router(kanban_stages.router, prefix="/api")
app.include_router(linkedin_searches.router, prefix="/api")
app.include_router(activity_log.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Hunty API"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
