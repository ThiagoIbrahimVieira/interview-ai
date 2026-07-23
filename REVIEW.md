---
phase: backend-review
reviewed: 2026-07-23T12:00:00Z
depth: deep
files_reviewed: 17
files_reviewed_list:
  - backend/app/main.py
  - backend/app/config.py
  - backend/app/database.py
  - backend/app/dependencies.py
  - backend/app/core/security.py
  - backend/app/core/rate_limiter.py
  - backend/app/core/middleware.py
  - backend/app/core/secure_logging.py
  - backend/app/api/v1/router.py
  - backend/app/services/user.py
  - backend/app/services/interview.py
  - backend/app/repositories/interview.py
  - backend/app/repositories/user.py
  - backend/app/repositories/report.py
  - backend/app/schemas/user.py
  - backend/app/schemas/interview.py
  - backend/app/models/interview.py
findings:
  critical: 5
  warning: 9
  info: 5
  total: 19
status: issues_found
---

# Phase: Backend Code Review Report

**Reviewed:** 2026-07-23T12:00:00Z
**Depth:** deep (cross-file tracing)
**Files Reviewed:** 17
**Status:** issues_found

## Summary

This is a deep adversarial review of the AI Interview Platform backend. The codebase has a clean architecture (router → service → repository → model) and generally solid patterns. However, **the entire token lifecycle security model is broken**: logout doesn't revoke tokens, refresh tokens are never rotated/invalidated, password changes don't invalidate sessions, and the revocation infrastructure itself is non-functional (no `jti` claim, in-memory blacklist). An attacker who steals any token can use it indefinitely regardless of user actions.

Beyond the auth lifecycle, there are state machine bugs (completing already-completed interviews), missing state guards (adding messages to ended sessions), hardcoded default secrets, and a always-zero `message_count` field that would confuse any frontend consumer.

---

## Critical Issues

### CR-01: JWT Token Revocation System Is Entirely Non-Functional

**Files:** `backend/app/core/security.py:25-57`, `backend/app/api/v1/router.py:97-102`

**Issue:** Three compounding failures render the token revocation system dead code:

1. **No `jti` claim in tokens** (`security.py:25-38`): `create_access_token()` and `create_refresh_token()` never add a `jti` (JWT ID) claim to the payload. The revocation check in `is_token_revoked()` at line 61 calls `payload.get("jti")` which always returns `None`, so `revoke_token()` is never effective.

2. **Logout doesn't call `revoke_token()`** (`router.py:97-102`): The logout endpoint receives the token via `get_current_user` (via `HTTPBearer`), but never extracts it or passes it to `revoke_token()`. It simply logs and returns `None`.

3. **Blacklist is in-memory only** (`security.py:53`): `_token_blacklist: set = set()` is a process-local Python set. On restart, all revoked tokens become valid again. In multi-worker deployments (gunicorn with N workers), each worker has its own independent blacklist — revoking in one worker has no effect in others.

**Production Impact:** A stolen access token (via XSS, MITM, log leak) is valid forever until expiry (30 minutes). A stolen refresh token is valid forever (7 days). Users have no way to invalidate compromised sessions. This is an authentication/authorization vulnerability.

**Fix:**
```python
# security.py - add jti to token creation
import uuid

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.now(timezone.utc).timestamp(),
        "jti": str(uuid.uuid4()),  # ADD THIS
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

# router.py - logout must extract and revoke the token
from fastapi.security import HTTPAuthorizationCredentials

@router.post("/auth/logout", status_code=204)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
):
    payload = decode_token(credentials.credentials)
    if payload and payload.get("jti"):
        revoke_token(payload["jti"])
    logger.info(f"Logout user_id={current_user.id}")
    return None
```

For the in-memory blacklist, replace with a database-backed blacklist table or Redis-backed solution for production multi-worker deployments.

---

### CR-02: Refresh Token Rotation Does Not Invalidate Old Tokens

**File:** `backend/app/api/v1/router.py:73-94`

**Issue:** The `/auth/refresh` endpoint issues a new access+refresh token pair but does **not** revoke the old refresh token. The old refresh token remains valid and can be used to mint yet another token pair, ad infinitum.

```python
# Current code (router.py:90-94):
access_token = create_access_token(data={"sub": str(user.id)})
new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
# OLD refresh token is NEVER revoked or blacklisted
return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)
```

**Production Impact:** If an attacker steals a refresh token, they can generate unlimited access tokens even after the legitimate user rotates their refresh token. This completely defeats refresh token rotation, which is the primary mechanism for limiting the blast radius of token theft.

**Fix:**
```python
@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefresh, request: Request, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Revoke the old refresh token (single-use enforcement)
    if payload.get("jti"):
        revoke_token(payload["jti"])

    user_id = payload.get("sub")
    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    service = UserService(db)
    user = await service.get_by_id(uid)

    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)
```

---

### CR-03: Password Change Does Not Invalidate Existing Tokens

**File:** `backend/app/api/v1/router.py:110-118`, `backend/app/services/user.py:77-83`

**Issue:** After a successful password change, all previously issued tokens remain valid. The password change endpoint updates the hash in the database but does not invalidate any outstanding JWTs.

```python
# router.py:110-118 — no token invalidation after password change
@router.post("/auth/change-password", status_code=204)
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    await service.change_password(current_user, data.current_password, data.new_password)
    # No token revocation here
```

**Production Impact:** If a user changes their password because they suspect compromise, the attacker's existing tokens continue working. This is a security-critical gap: password change is the nuclear option for session invalidation, and it's broken.

**Fix:** Add a `token_version` or `password_changed_at` column to the User model. Include it in the JWT payload. On each request, verify the token's version matches the current version. Alternatively, after password change, revoke all tokens for that user (requires a user-level revocation mechanism beyond the current jti-based approach).

---

### CR-04: Hardcoded Default JWT Secret Enables Token Forgery

**File:** `backend/app/config.py:84,90`

**Issue:** Both `SECRET_KEY` and `JWT_SECRET_KEY` have hardcoded defaults:
```python
SECRET_KEY: str = "change-me"
JWT_SECRET_KEY: str = "change-me-jwt"
```

If a deployer forgets to set these environment variables (easy to do on Render, Vercel, etc.), the application starts successfully with these guessable values. An attacker who knows the default values (they're in the source code on GitHub) can forge arbitrary JWT tokens — including `is_superuser=True` — and gain full admin access.

**Production Impact:** Complete authentication bypass. Any user can escalate to superuser by crafting a JWT signed with `"change-me-jwt"`.

**Fix:**
```python
class Settings(BaseSettings):
    # Fail fast if secrets aren't configured
    SECRET_KEY: str = Field(..., description="Must be set in production")
    JWT_SECRET_KEY: str = Field(..., description="Must be set in production")
```

Or at minimum, add a startup check:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.JWT_SECRET_KEY in ("change-me-jwt", ""):
        raise RuntimeError("JWT_SECRET_KEY must be set to a secure random value")
    yield
```

---

### CR-05: Registration Endpoint Has No Rate Limiting

**File:** `backend/app/api/v1/router.py:39-45`

**Issue:** The `/auth/register` endpoint has no rate limiting. The global `RateLimitMiddleware` (60 req/min/IP) applies, but this is easily circumvented with IP rotation. Unlike the `/auth/login` endpoint which has dedicated `check_login_rate_limit`, registration has no per-IP or per-email throttling.

```python
@router.post("/auth/register", response_model=UserResponse, status_code=201)
async def register(data: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    service = UserService(db)
    user = await service.register(data.email, data.password, data.full_name)
    # No rate limiting on registration
```

**Production Impact:** An attacker can create unlimited accounts (spam/DoS), exhaust database storage, pollute email-based features, and potentially use registration as a username enumeration oracle (via the 409 Conflict response).

**Fix:** Add `rate_store.check_login_rate_limit(f"register:{client_ip}", ...)` before the registration logic, similar to the login endpoint.

---

## Warnings

### WR-01: `message_count` in API Response Always Returns Zero

**Files:** `backend/app/schemas/interview.py:125`, `backend/app/models/interview.py:22-40`

**Issue:** `InterviewSessionResponse` declares `message_count: int = 0` (schemas/interview.py:125), but the `InterviewSession` SQLAlchemy model has no `message_count` column or computed property. When Pydantic constructs the response from the ORM object (`from_attributes=True`), it calls `getattr(session, 'message_count')` which raises `AttributeError`, causing Pydantic to use the field default of `0`.

The interview repository's `get_user_sessions` also never populates this field.

**Production Impact:** Every interview list and detail response shows `message_count: 0`. The frontend displays "0 messages" for all sessions, making the message count UI element permanently broken.

**Fix:** Either add a hybrid property to the model:
```python
# models/interview.py
from sqlalchemy.orm import hybrid_property

class InterviewSession(Base):
    @hybrid_property
    def message_count(self):
        return len(self.messages) if self.messages else 0
```
Or add a subquery to `get_user_sessions` in the repository to populate the count.

---

### WR-02: `add_message` Has No Session State Guard

**Files:** `backend/app/services/interview.py:44-52`, `backend/app/api/v1/router.py:188-198`

**Issue:** The `add_message` method and the `POST /interviews/{session_id}/messages` endpoint do not check whether the session is in `"active"` status. Messages can be added to sessions with `status="completed"`, `"pending"`, or any arbitrary string.

```python
# services/interview.py:44-52 — no status check
async def add_message(self, session_id: int, role: str, content: str) -> Message:
    message = Message(session_id=session_id, role=role, content=content)
    return await self.repo.add_message(message)
```

**Production Impact:** Users can add messages to ended interviews, corrupting the conversation history. This breaks the interview state machine and could produce misleading reports if reports are generated from post-completion messages.

**Fix:**
```python
async def add_message(self, session_id: int, role: str, content: str, user_id: int) -> Message:
    session = await self.repo.get_session(session_id)
    if not session or session.user_id != user_id:
        raise ForbiddenException("Not authorized")
    if session.status != "active":
        raise ValidationException("Interview is not active")
    message = Message(session_id=session_id, role=role, content=content)
    return await self.repo.add_message(message)
```

---

### WR-03: `end_interview` Has No State Guard — Can End Already-Completed Sessions

**File:** `backend/app/services/interview.py:57-73`

**Issue:** `end_interview()` does not check if the session is already `"completed"`. Calling it multiple times overwrites `ended_at`, `duration_seconds`, and `final_score` with new values.

```python
async def end_interview(self, session_id: int, user_id: int, final_score: float = 0.0):
    session = await self.get_session(session_id, user_id)
    # No check: if session.status == "completed", reject
    duration = 0
    if session.started_at:
        ...
    await self.repo.update_session(session, status="completed", ...)
```

**Production Impact:** If a client retries `end_interview` (e.g., network timeout), the duration and score are recalculated and overwritten. The original end time is lost, corrupting analytics data.

**Fix:**
```python
async def end_interview(self, session_id: int, user_id: int, final_score: float = 0.0):
    session = await self.get_session(session_id, user_id)
    if session.status == "completed":
        return session  # Idempotent: return existing completed session
    ...
```

---

### WR-04: `end_interview` Allows Arbitrary `final_score` from Client

**Files:** `backend/app/api/v1/router.py:213-222`, `backend/app/services/interview.py:57`

**Issue:** The `end_interview` service method accepts a `final_score` parameter, but the endpoint at `router.py:220` doesn't pass one (defaults to `0.0`). However, the `final_score` column on the model is writable. The real concern: the schema doesn't expose `final_score` as input, but any future code change could pass untrusted client input directly into `final_score` with no bounds validation. The model stores it as `Float` with no constraints.

**Production Impact:** Currently mitigated by the schema not accepting it, but the service API is an injection point. If any other endpoint or background job passes user-controlled data to `final_score`, scores could be set to negative values, NaN, or Infinity.

**Fix:** Add validation in the service layer:
```python
if not 0.0 <= final_score <= 100.0:
    raise ValidationException("Score must be between 0 and 100")
```

---

### WR-05: Streak Calculation Bridges One-Day Gaps

**File:** `backend/app/repositories/interview.py:107-118`

**Issue:** The streak calculation has a special `elif` branch that bridges a one-day gap:
```python
elif d == expected - timedelta(days=1):
    streak += 1
    expected = d - timedelta(days=1)
```

If a user misses a day but interviews the next day, the streak continues as if they didn't miss. For example, with sessions on Mon, Wed, Thu (no Tue), the streak is counted as 3 consecutive days.

**Production Impact:** Users who skip days still maintain streaks, undermining the gamification incentive. This is likely a logic error — most streak implementations require consecutive days with at most a "grace period" for today (if you haven't interviewed yet today, yesterday counts).

**Fix:** Remove the `elif` branch and only accept exact matches:
```python
for d in sorted_dates:
    if d == expected:
        streak += 1
        expected -= timedelta(days=1)
    else:
        break
```

---

### WR-06: `get_user_stats` Uses Server Local Time for Date Calculation

**File:** `backend/app/repositories/interview.py:108`

**Issue:** `today = date.today()` uses the server's local timezone, not UTC. The `ended_at` timestamps on sessions are stored in UTC (`DateTime(timezone=True)`). This creates a timezone mismatch: streaks and improvement calculations depend on local time, but session dates are UTC.

**Production Impact:** If the server is in UTC+5 and it's 11 PM local time (6 PM UTC), the streak "today" check uses the local date, but a session completed 30 minutes ago (still today in UTC) might appear as "yesterday" when the dates are compared as naive dates. Streaks could appear broken or extended depending on the timezone offset and time of day.

**Fix:**
```python
from datetime import datetime, timezone
today = datetime.now(timezone.utc).date()
```

---

### WR-07: `Profile.streak`, `total_interviews`, `average_score` Are Never Updated

**Files:** `backend/app/models/profile.py:16-18`, `backend/app/repositories/user.py:20-26`

**Issue:** The `Profile` model has `streak`, `total_interviews`, and `average_score` columns that are initialized to `0` during registration (repositories/user.py:23-25). No code in the entire codebase ever updates these fields after creation. The dashboard stats are computed dynamically in `get_user_stats()`, but the Profile model's denormalized fields are permanently stale.

The `ProfileResponse` schema exposes these fields:
```python
class ProfileResponse(BaseModel):
    streak: int
    total_interviews: int
    average_score: int
```

**Production Impact:** Any code path that reads `user.profile.total_interviews` (e.g., admin dashboards, caching layers, mobile apps that read Profile directly) will always see `0`. The values only make sense when read through `get_user_stats()`.

**Fix:** Either update these fields in a post-interview hook, or remove them from the Profile model entirely and serve stats exclusively through `get_user_stats()`.

---

### WR-08: `add_message` Allows Caller to Forge Message Role

**File:** `backend/app/services/interview.py:44-52`, `backend/app/api/v1/router.py:188-198`

**Issue:** The `add_message` service accepts a `role: str` parameter with no validation. While the current endpoint hardcodes `"user"`, the service method is a public API that any caller could use to inject messages with `role="assistant"` or `role="system"`, forging conversation history.

```python
# services/interview.py:44-52
async def add_message(self, session_id: int, role: str, content: str) -> Message:
    message = Message(session_id=session_id, role=role, content=content)
    return await self.repo.add_message(message)
```

**Production Impact:** If any future code path passes user input as the role (e.g., admin replay endpoint, bulk import), an attacker can inject fake AI responses into the interview transcript, corrupting reports and scoring.

**Fix:**
```python
async def add_message(self, session_id: int, role: str, content: str) -> Message:
    if role not in ("user", "assistant", "system"):
        raise ValidationException(f"Invalid message role: {role}")
    ...
```

---

### WR-09: `get_messages` Endpoint Has No `response_model`

**File:** `backend/app/api/v1/router.py:201-210`

**Issue:** The `GET /interviews/{session_id}/messages` endpoint has no `response_model` defined:
```python
@router.get("/interviews/{session_id}/messages")
async def get_messages(session_id: int, ...):
    messages = await service.get_messages(session_id)
    return messages
```

Returning raw SQLAlchemy ORM objects without a Pydantic response model means FastAPI uses `jsonable_encoder` to serialize, which will include `_sa_instance_state` metadata in the output or cause serialization errors depending on the FastAPI/Pydantic version.

**Production Impact:** The response body may include internal SQLAlchemy state (`_sa_instance_state`), or the endpoint may return a 500 error if serialization fails. This is unreliable across FastAPI versions.

**Fix:**
```python
from app.schemas.interview import MessageResponse
from typing import List

@router.get("/interviews/{session_id}/messages", response_model=List[MessageResponse])
async def get_messages(...):
    ...
```

---

## Info

### IN-01: `SecureLogger` Instances Created But Never Used

**Files:** `backend/app/api/v1/router.py:33`, `backend/app/core/middleware.py:9`, `backend/app/services/user.py:18`

**Issue:** Multiple modules instantiate `secure = SecureLogger()` at module level but never call any methods on it. The `SecureLogger.sanitize()` method exists but is never invoked in the middleware logging or router logging.

**Fix:** Either wire `SecureLogger.sanitize()` into the logging pipeline (sanitize all log messages), or remove the dead instances to reduce confusion.

---

### IN-02: `rate_limiter.py` Logs Client IP in Plaintext

**File:** `backend/app/core/rate_limiter.py:90`

**Issue:** `logger.warning(f"Rate limit exceeded for IP: {client_ip}")` logs the client's IP address in plaintext. Under GDPR and similar regulations, IP addresses are personal data and should not be logged without justification.

**Fix:** Hash or truncate the IP before logging, or use a consistent identifier that doesn't constitute PII.

---

### IN-03: `InterviewSession.status` Has No Enum Constraint

**Files:** `backend/app/models/interview.py:28`, `backend/app/services/interview.py:28,68`

**Issue:** `status = Column(String(50), default="pending")` accepts any arbitrary string. The code uses `"pending"`, `"active"`, and `"completed"` as string literals scattered across services and repositories. There is no enum, no check constraint, and no validation at the model level.

**Fix:** Define an enum and use it at both the model and schema level:
```python
import enum

class SessionStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
```

---

### IN-04: `PasswordChange` Schema Doesn't Validate `new_password != current_password`

**File:** `backend/app/schemas/user.py:60-73`

**Issue:** A user can "change" their password to the same password. While not a security vulnerability per se, it silently succeeds and could confuse users who think their password was actually changed.

**Fix:** Add a validator: `if v == current_password: raise ValueError("New password must differ from current")`.

---

### IN-05: Streak Calculation Loads All Completed Sessions Into Memory

**File:** `backend/app/repositories/interview.py:86-95`

**Issue:** `get_user_stats` executes a full query for all completed sessions of a user (no LIMIT) and materializes them in Python to compute streaks and improvement. A power user with hundreds of completed interviews loads all their session records into memory just to count consecutive dates.

**Fix:** Use a SQL-based approach or limit the query to the last N sessions (e.g., last 365 days) since streaks beyond a year are meaningless.

---

_Reviewed: 2026-07-23T12:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
