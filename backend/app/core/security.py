from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import get_settings
import logging
import time

trace = logging.getLogger("trace")

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    trace.info("[TRACE] hash_password: hashing")
    t0 = time.monotonic()
    result = pwd_context.hash(password)
    trace.info(f"[TRACE] hash_password: done in {time.monotonic() - t0:.3f}s")
    return result


def verify_password(plain_password: str, hashed_password: str) -> bool:
    trace.info("[TRACE] verify_password: verifying")
    t0 = time.monotonic()
    result = pwd_context.verify(plain_password, hashed_password)
    trace.info(f"[TRACE] verify_password: result={result} in {time.monotonic() - t0:.3f}s")
    return result


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    trace.info("[TRACE] create_access_token: encoding")
    t0 = time.monotonic()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    result = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    trace.info(f"[TRACE] create_access_token: done in {time.monotonic() - t0:.3f}s")
    return result


def create_refresh_token(data: dict) -> str:
    trace.info("[TRACE] create_refresh_token: encoding")
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    result = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    trace.info("[TRACE] create_refresh_token: done")
    return result


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
