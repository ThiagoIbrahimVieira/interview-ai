from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import init_db
from app.core.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.api.v1.router import router as api_router
import logging
import time

settings = get_settings()

clean_origins = [o.rstrip("/") for o in settings.ALLOWED_ORIGINS]

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))
trace = logging.getLogger("trace")
trace.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    trace.info("[TRACE] lifespan: START")
    t0 = time.monotonic()
    await init_db()
    trace.info(f"[TRACE] lifespan: init_db done in {time.monotonic() - t0:.3f}s, yielding now")
    trace.info(f"[TRACE] lifespan: CORS origins={clean_origins}")
    yield
    trace.info("[TRACE] lifespan: shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=clean_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    trace.info("[TRACE] health: request received")
    return {"status": "healthy", "version": settings.APP_VERSION}
