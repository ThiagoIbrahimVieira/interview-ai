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
    logger = logging.getLogger("uvicorn.error")
    logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )

app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=settings.RATE_LIMIT_PER_MINUTE)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=clean_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/debug/fix-tables")
async def debug_fix_tables():
    from app.database import engine, Base
    from app.models.user import User
    from app.models.interview import InterviewSession, InterviewConfig, Message
    from app.models.profile import Profile
    from app.models.score import Score
    from app.models.report import Report
    from sqlalchemy import text
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            ))
            existing = {row[0] for row in result.fetchall()}

            needed = {
                "users", "profiles", "interview_configs",
                "interview_sessions", "messages", "scores", "reports"
            }
            missing = needed - existing

            if missing:
                await conn.run_sync(Base.metadata.create_all)
                await conn.commit()
                return {"existing": sorted(existing), "missing": sorted(missing), "created": True}

            # Check columns for each table
            issues = []
            for table_name in ["users", "interview_sessions", "messages"]:
                col_result = await conn.execute(text(
                    f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'"
                ))
                cols = {row[0] for row in col_result.fetchall()}
                if table_name == "users" and "token_version" not in cols:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"))
                    issues.append("added token_version to users")

            if issues:
                await conn.commit()

            return {"existing": sorted(existing), "missing": [], "issues": issues}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e), "type": type(e).__name__})
