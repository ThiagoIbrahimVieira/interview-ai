from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.core.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.core.rate_limiter import RateLimitMiddleware
from app.api.v1.router import router as api_router
import logging
import time

settings = get_settings()

clean_origins = [o.rstrip("/") for o in settings.ALLOWED_ORIGINS]

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))
trace = logging.getLogger("trace")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.JWT_SECRET_KEY in ("change-me-jwt", ""):
        raise RuntimeError("JWT_SECRET_KEY must be set to a secure random value")
    if settings.SECRET_KEY in ("change-me", ""):
        raise RuntimeError("SECRET_KEY must be set to a secure random value")
    from app.database import init_db
    await init_db()
    trace.info("[TRACE] lifespan: START")
    yield
    trace.info("[TRACE] lifespan: shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=clean_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(RateLimitMiddleware, max_requests=settings.RATE_LIMIT_PER_MINUTE)
app.add_middleware(LoggingMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
