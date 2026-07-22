from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

database_url = settings.DATABASE_URL
is_sqlite = database_url.startswith("sqlite")


def _normalize_async_url(url: str) -> str:
    """Ensure a bare PostgreSQL URL carries the asyncpg driver suffix.

    Render and most managed providers supply a bare ``postgresql://`` URL.
    ``create_async_engine`` needs an explicit async driver suffix — without
    it SQLAlchemy falls back to the sync ``psycopg2`` driver which is not
    installed.

    Only rewrites URLs that have **no** driver suffix (``postgresql://`` or
    ``postgres://``).  URLs that already carry a driver (e.g.
    ``postgresql+asyncpg://``) are returned unchanged.
    """
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    return url


database_url = _normalize_async_url(database_url)

engine_kwargs = {
    "echo": settings.DATABASE_ECHO,
    "pool_pre_ping": True,
}

if not is_sqlite:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10

engine = create_async_engine(database_url, **engine_kwargs)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
