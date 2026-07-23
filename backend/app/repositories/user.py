from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.profile import Profile
from typing import Optional
import logging
import time

trace = logging.getLogger("trace")


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Optional[User]:
        trace.info(f"[TRACE] repo.get_by_email: executing query for email={email}")
        t0 = time.monotonic()
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        trace.info(f"[TRACE] repo.get_by_email: query done in {time.monotonic() - t0:.3f}s, found={'yes' if user else 'no'}")
        return user

    async def get_by_id(self, user_id: int) -> Optional[User]:
        trace.info(f"[TRACE] repo.get_by_id: executing query for user_id={user_id}")
        t0 = time.monotonic()
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        trace.info(f"[TRACE] repo.get_by_id: query done in {time.monotonic() - t0:.3f}s")
        return user

    async def create(self, user: User) -> User:
        trace.info("[TRACE] repo.create: adding user to session")
        t0 = time.monotonic()
        self.db.add(user)
        await self.db.flush()
        trace.info(f"[TRACE] repo.create: user flushed in {time.monotonic() - t0:.3f}s, creating profile")
        profile = Profile(user_id=user.id)
        self.db.add(profile)
        await self.db.flush()
        trace.info(f"[TRACE] repo.create: profile flushed in {time.monotonic() - t0:.3f}s total")
        return user

    async def update(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            setattr(user, key, value)
        await self.db.flush()
        return user
