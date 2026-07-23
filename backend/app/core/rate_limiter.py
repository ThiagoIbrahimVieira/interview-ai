import time
import logging
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimitStore:
    """In-memory sliding window rate limiter."""

    def __init__(self):
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._login_attempts: dict[str, list[float]] = defaultdict(list)
        self._locked_accounts: dict[str, float] = {}
        self._last_global_cleanup: float = time.time()

    def _cleanup(self, key: str, window: float):
        now = time.time()
        self._requests[key] = [t for t in self._requests[key] if now - t < window]

    def _global_cleanup(self):
        """Periodic cleanup of stale entries to prevent unbounded memory growth."""
        now = time.time()
        if now - self._last_global_cleanup < 300:  # every 5 minutes
            return
        self._last_global_cleanup = now
        stale_keys = [k for k, v in self._requests.items() if not v]
        for k in stale_keys:
            del self._requests[k]
        stale_logins = [k for k, v in self._login_attempts.items() if not v]
        for k in stale_logins:
            del self._login_attempts[k]
        expired_lockouts = [k for k, t in self._locked_accounts.items() if now - t > 900]
        for k in expired_lockouts:
            del self._locked_accounts[k]

    def check_rate_limit(self, key: str, max_requests: int, window: float = 60.0) -> bool:
        self._global_cleanup()
        self._cleanup(key, window)
        if len(self._requests[key]) >= max_requests:
            return False
        self._requests[key].append(time.time())
        return True

    def check_login_rate_limit(self, identifier: str, max_attempts: int, lockout_minutes: int) -> bool:
        now = time.time()
        if identifier in self._locked_accounts:
            if now - self._locked_accounts[identifier] < lockout_minutes * 60:
                return False
            del self._locked_accounts[identifier]
            self._login_attempts[identifier] = []

        window = 60.0
        self._login_attempts[identifier] = [
            t for t in self._login_attempts[identifier] if now - t < window
        ]

        if len(self._login_attempts[identifier]) >= max_attempts:
            self._locked_accounts[identifier] = now
            return False

        self._login_attempts[identifier].append(now)
        return True

    def reset_login_attempts(self, identifier: str):
        self._login_attempts.pop(identifier, None)
        self._locked_accounts.pop(identifier, None)


_rate_store = RateLimitStore()


def get_rate_store() -> RateLimitStore:
    return _rate_store


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window: float = 60.0):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"ip:{client_ip}"

        if not _rate_store.check_rate_limit(key, self.max_requests, self.window):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )

        return await call_next(request)
