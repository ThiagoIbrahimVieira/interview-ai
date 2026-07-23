from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.user import UserRepository
from app.models.user import User
from app.models.profile import Profile
from app.core.security import hash_password, verify_password
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
)
from typing import Optional
import logging
import time

trace = logging.getLogger("trace")


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def register(self, email: str, password: str, full_name: Optional[str] = None) -> User:
        trace.info(f"[TRACE] register: checking existing email={email}")
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ConflictException("Email already registered")

        trace.info("[TRACE] register: hashing password")
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
        )
        trace.info("[TRACE] register: creating user in DB")
        result = await self.repo.create(user)
        trace.info(f"[TRACE] register: user created id={result.id}")
        return result

    async def authenticate(self, email: str, password: str) -> User:
        trace.info(f"[TRACE] authenticate: looking up email={email}")
        t0 = time.monotonic()
        user = await self.repo.get_by_email(email)
        trace.info(f"[TRACE] authenticate: get_by_email returned in {time.monotonic() - t0:.3f}s, user={'found' if user else 'None'}")
        if not user or not verify_password(password, user.hashed_password):
            trace.info("[TRACE] authenticate: password verification FAILED")
            raise UnauthorizedException("Invalid email or password")
        trace.info("[TRACE] authenticate: password verification PASSED")
        if not user.is_active:
            raise UnauthorizedException("Account is deactivated")
        trace.info("[TRACE] authenticate: returning user")
        return user

    async def get_by_id(self, user_id: int) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        return user

    async def get_profile(self, user_id: int) -> Profile:
        result = await self.db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise NotFoundException("Profile not found")
        return profile

    async def update_profile(self, user_id: int, **kwargs) -> Profile:
        result = await self.db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise NotFoundException("Profile not found")

        for key, value in kwargs.items():
            if value is not None:
                setattr(profile, key, value)

        await self.db.flush()
        return profile

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedException("Current password is incorrect")
        if len(new_password) < 8:
            raise ValidationException("Password must be at least 8 characters")
        user.hashed_password = hash_password(new_password)
        await self.db.flush()
