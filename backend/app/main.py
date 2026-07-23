from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.config import get_settings
from app.core.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.core.rate_limiter import RateLimitMiddleware
from app.api.v1.router import router as api_router
import logging
import time
import traceback

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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    logger.error(f"Unhandled exception: {exc}\n{''.join(tb)}")
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail, "type": type(exc).__name__},
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


@app.get("/debug/db")
async def debug_db():
    from app.database import engine
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return {"db": "ok", "result": result.scalar()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"db": "error", "detail": str(e), "type": type(e).__name__})


@app.get("/debug/alembic")
async def debug_alembic():
    from app.database import engine
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"))
            columns = [row[0] for row in result.fetchall()]
            has_token = "token_version" in columns
            if not has_token:
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0"))
                await conn.commit()
                columns.append("token_version")
            return {"columns": columns, "has_token_version": True, "added": not has_token}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e), "type": type(e).__name__})
