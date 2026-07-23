# Production Readiness Audit — InterviewAI

**Auditor:** Independent technical review (simulating Google/Stripe/Linear engineering standards)
**Date:** 2026-07-23
**Scope:** Full codebase — backend, frontend, infrastructure, security, performance, code quality

---

## FINDINGS

### CRITICAL

| # | File | Line | Issue | Impact | Fix |
|---|------|------|-------|--------|-----|
| C1 | `backend/app/api/v1/router.py` | 97-102 | **Logout does not revoke the token.** The endpoint returns 204 but never calls `revoke_token()`. Logged-out tokens remain valid until natural expiry. | Any user who "logs out" can still use their token for up to 30 minutes. In a shared-device scenario, this is a real auth bypass. | Extract `jti` from the token and call `revoke_token(jti)` before returning. |
| C2 | `frontend-next/app/report/[id]/page.tsx` | 107-112 | **Category scores are random noise.** `Math.random()` is used to generate "Technical Knowledge", "Communication", etc. These values change on every page render and have no relation to actual performance. | Users see different scores each time they view the same report. Completely undermines the product's value proposition. | Compute real category scores from the AI's message analysis, or remove the section entirely. |
| C3 | `frontend-next/app/(dashboard)/new-interview/page.tsx` | 23-33 | **No frontend validation on job_title.** The form marks `job_title` as `required` but the `handleSubmit` reads from `form.elements` without checking if the value is empty. A user can submit a blank job title (e.g., by removing the `required` attribute via DevTools). | Backend rejects it with a 422, but the UX is poor — no client-side feedback. Combined with C2, the product feels unfinished. | Add a `if (!config.job_title)` check before calling `api.startInterview()`. |

### HIGH

| # | File | Line | Issue | Impact | Fix |
|---|------|------|-------|--------|-----|
| H1 | `backend/app/api/v1/router.py` | 73-94 | **Refresh token rotation does not revoke old token.** When `/auth/refresh` is called, a new token pair is issued but the old refresh token remains valid. | An attacker who steals a refresh token can use it indefinitely, even after the legitimate user has refreshed. | Add `revoke_token(old_jti)` before issuing new tokens. |
| H2 | `backend/app/api/v1/router.py` | 97-102 | **Logout requires authentication.** If the access token is expired, the user cannot call `/auth/logout`. They must first refresh, then logout — but if the refresh token is also compromised, this is a loop. | Users cannot cleanly invalidate their session when the token has already expired. | Accept an optional token in the body, or revoke both tokens using the refresh token. |
| H3 | `frontend-next/app/interview/[id]/page.tsx` | 107-130 | **AI is entirely client-side via Puter.js CDN.** The interview "AI" runs in the browser, calling `window.puter.ai.chat()`. If Puter.js is down, rate-limited, or the user blocks third-party scripts, the entire product fails. | Complete product failure for any user who cannot reach `js.puter.com`. No server-side fallback exists. | Add a backend AI proxy endpoint (even a simple one) as a fallback. |
| H4 | `backend/app/database.py` | 48-57 | **Auto-commit in `get_db()` dependency.** The session commits on success, but if the endpoint handler already committed (or the code evolves to do so), this is a silent double-commit. More critically, if `commit()` fails after the handler succeeds, the user sees an error but the data was partially written. | Subtle data integrity bugs as the codebase evolves. The implicit commit makes transaction boundaries unclear. | Remove the auto-commit. Let each service/repository explicitly commit within a transaction. |
| H5 | `backend/app/core/rate_limiter.py` | 14 | **`defaultdict(list)` never evicts keys.** `_requests` is a `defaultdict(list)`. Every unique IP creates a permanent key. Under sustained traffic (or a DDoS with rotating IPs), this is unbounded memory growth. | Memory leak over time. On a long-running server, this can cause OOM kills. | Use a bounded cache (e.g., `cachetools.TTLCache`) or add explicit eviction. |
| H6 | `frontend-next/app/(dashboard)/history/page.tsx` | 31 | **Fetches 50 interviews in one request.** `api.getInterviews(1, 50)` loads all history without pagination. For a power user with hundreds of interviews, this is slow and wastes bandwidth. | Slow page loads, high memory usage on the client, excessive database load. | Implement cursor-based or offset pagination with a "Load More" button. |
| H7 | `backend/app/services/interview.py` | 57-73 | **`end_interview` hardcodes `final_score=0.0`.** When an interview ends, the score is always set to 0. The actual AI evaluation never populates this field. | All completed interviews show 0% score. The dashboard, history, and report pages all display meaningless data. | Hook into the AI evaluation pipeline to compute and store the real score. |

### MEDIUM

| # | File | Line | Issue | Impact | Fix |
|---|------|------|-------|--------|-----|
| M1 | `backend/requirements.txt` | 14-15 | **Both `python-jose` and `pyjwt` are installed.** Only `python-jose` is used in code. `pyjwt` is a dead dependency. | Unnecessary attack surface, bloat, potential version conflicts. | Remove `pyjwt` from requirements.txt. |
| M2 | `backend/requirements.txt` | 13 | **`httpx` is installed but never imported.** It's a dev/test dependency being installed in production. | Unnecessary attack surface and ~2MB of bloat. | Move to a `requirements-dev.txt` or remove if unused. |
| M3 | `backend/app/utils/__init__.py` | 1 | **Empty `utils/` package.** The directory exists but contains nothing. Dead code. | Confusion for new developers. "Where are the utils?" | Remove the directory. |
| M4 | `frontend/` | — | **Entire old vanilla JS frontend exists alongside Next.js.** 21 files of dead code. | Massive confusion. Which frontend is the real one? Increases repo size and cognitive load. | Delete the `frontend/` directory entirely. |
| M5 | `backend/app/api/v1/router.py` | 241 | **`ReportRepository` imported inside function body.** This is a code smell — it's done to avoid circular imports, but the circular import shouldn't exist. | Fragile architecture. If the import graph changes, this breaks silently. | Restructure to avoid the circular dependency at the module level. |
| M6 | `frontend-next/app/(dashboard)/layout.tsx` | 38-40 | **Logout does not call the backend `/auth/logout` endpoint.** When the token is invalid, the frontend just clears localStorage. The backend never knows the session ended. | Server-side token remains valid (combined with C1). Audit logs show no logout event. | Call `api.post("/auth/logout")` before clearing tokens. |
| M7 | `backend/app/models/achievement.py` | 1-16 | **`Achievement` model defined but never used.** No endpoint creates or reads achievements. Dead schema. | Confusing schema. Developers will wonder what achievements are and why they're not implemented. | Remove the model or implement the feature. |
| M8 | `backend/app/config.py` | 84 | **`SECRET_KEY` defaults to `"change-me"`.** If the env var is not set, the app starts with a known secret. | In production, if `SECRET_KEY` is misconfigured, the app runs with a default that anyone can guess. | Fail hard on startup if `SECRET_KEY == "change-me"` in production. |
| M9 | `frontend-next/lib/api.ts` | 61-76 | **Race condition in token refresh.** If multiple requests fail with 401 simultaneously, each one triggers `refreshAccessToken()`. Only one succeeds; the others get invalid tokens. | Brief window where requests fail even though the refresh succeeded. Users see intermittent "Session expired" errors. | Add a refresh mutex — only one refresh in flight at a time. |
| M10 | `backend/app/core/middleware.py` | 40-42 | **HSTS header set in development.** `Strict-Transport-Security` with `max-age=63072000` is sent even in dev mode. | Browsers may refuse to connect to `http://localhost` after visiting the dev server. | Only set HSTS when `APP_ENV == "production"`. |
| M11 | `backend/app/repositories/interview.py` | 72-134 | **`get_user_stats` loads ALL completed sessions into memory.** For a user with 1000 interviews, this loads 1000 ORM objects just to compute a streak and average. | O(n) memory and time for every dashboard load. Database query is expensive. | Compute streak and improvement via SQL aggregates. |
| M12 | `backend/alembic.ini` | 4 | **Hardcoded placeholder DB URL.** `sqlalchemy.url = postgresql+asyncpg://user:password@localhost:5432/ai_interview` is committed to git. | If someone runs `alembic upgrade head` without setting the env var, it tries to connect to a non-existent database. | Remove the hardcoded URL. Use env var interpolation. |
| M13 | `frontend-next/app/report/[id]/page.tsx` | 107-112 | **`Math.random()` in render.** Category scores use `Math.random()`, so they change on every re-render (e.g., when the window is resized). | Scores flicker and change randomly. Breaks React's deterministic rendering principle. | Use seeded random or remove. |
| M14 | `frontend-next/.env.local` | 1 | **`.env.local` committed to git.** Contains the production API URL. | Exposes infrastructure details. If the API key were in this file, it would be a leak. | Add `.env.local` to `.gitignore`. |

### LOW

| # | File | Line | Issue | Impact | Fix |
|---|------|------|-------|--------|-----|
| L1 | `backend/app/schemas/interview.py` | 94-100 | **Redundant validator.** `MessageCreate.validate_content` strips and checks empty, but `Field(min_length=1)` already enforces this. | Dead code. Double validation is confusing. | Remove the validator; rely on `min_length`. |
| L2 | `backend/app/schemas/user.py` | 64-73 | **Password validation duplicated.** `PasswordChange.validate_new_password` repeats the same regex checks as `UserCreate.validate_password`. | If one is updated, the other must be manually kept in sync. Bug magnet. | Extract a shared `validate_password_strength()` function (already exists in `security.py`). |
| L3 | `frontend-next/components/Toast.tsx` | 22 | **Module-level `toastId`.** `let toastId = 0` is a module-level counter. In SSR, this counter persists across requests, causing non-deterministic IDs. | Theoretical SSR hydration mismatch. In practice, toasts are client-only, so low risk. | Use `useRef` or `useState` for the counter. |
| L4 | `frontend-next/app/page.tsx` | 9-16 | **Redirect uses `useRef` to prevent double-fire.** This is a workaround for React StrictMode double-mounting. | Fragile — if StrictMode behavior changes, this breaks. | Use Next.js middleware for redirects instead. |
| L5 | `backend/app/core/rate_limiter.py` | 90 | **Rate limit log exposes IP.** `logger.warning(f"Rate limit exceeded for IP: {client_ip}")` logs the full IP. | Privacy concern in production logs. IP addresses are PII under GDPR. | Hash the IP before logging, or log only the last octet. |
| L6 | `backend/app/main.py` | 29 | **`docs_url="/docs"` in debug mode only.** This is correct, but if `DEBUG` is accidentally `True` in production, the Swagger UI is exposed. | API documentation exposed to end users. | Add a startup check: if `APP_ENV == "production"` and `DEBUG == True`, log a warning or fail. |
| L7 | `frontend-next/lib/store.tsx` | 15-16 | **`Record<string, unknown>` for user type.** The store uses untyped records instead of proper interfaces. | No type safety. `user?.full_name` could be any type. | Define `User` and `Session` interfaces. |
| L8 | `frontend-next/app/(dashboard)/profile/page.tsx` | 84-87 | **`localStorage.clear()` on sign out.** This clears ALL localStorage, including theme preference and any future cached data. | User loses their theme setting and any other stored preferences. | Only remove `access_token`, `refresh_token`, and `theme` (keep theme). |
| L9 | `backend/app/core/exceptions.py` | 1-31 | **Custom exceptions defined but barely used.** Router raises `HTTPException` directly in most places. | Inconsistent error handling. The exception hierarchy adds no value. | Either use them everywhere or remove them. |
| L10 | `frontend-next/app/interview/[id]/page.tsx` | 231-243 | **Timer starts on mount, not on first message.** The timer begins immediately when the page loads, not when the interview actually starts. | Timer includes the "thinking" time before the user answers anything. | Start the timer on the first user message. |
| L11 | `backend/app/repositories/user.py` | 28-31 | **`update()` accepts arbitrary `**kwargs` with `setattr`.** Any key-value pair can be passed, including columns that shouldn't be updated (e.g., `is_superuser`). | Potential privilege escalation if a caller passes `is_superuser=True`. | Whitelist allowed update fields. |

---

## CATEGORY SCORES

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | 68/100 | Clean layered structure (router → service → repository → model), but the logout/auth flow is broken, AI is client-only, and there's dead code everywhere. The auto-commit pattern in `get_db()` is a ticking time bomb. |
| **Security** | 72/100 | Rate limiting, input validation, CORS, headers — all solid. But logout doesn't revoke tokens (C1), refresh tokens aren't rotated (H1), and the AI prompt is fully exposed to the client (H3). |
| **Backend** | 70/100 | Well-structured with async SQLAlchemy, proper error handling, and clean separation of concerns. But the `get_db()` auto-commit, unused models, and inconsistent exception usage drag it down. |
| **Frontend** | 58/100 | Beautiful UI with good animations, but fake scores (C2), no pagination (H6), untyped store (L7), and the old frontend directory is confusing. The Puter.js dependency is a single point of failure. |
| **Performance** | 65/100 | `get_user_stats` loads all sessions into memory (M11). History fetches 50 items at once (H6). No connection pool timeout. No query optimization beyond basic `selectinload`. |
| **Scalability** | 55/100 | In-memory rate limiter won't work across workers (documented limitation). No caching layer. No background job system. The AI is client-side, so the backend is just a CRUD API — it scales fine, but the product doesn't. |
| **Code Quality** | 72/100 | Consistent style, good use of Pydantic, clean model definitions. But dead code (M3, M4, M7), duplicated validators (L1, L2), and inconsistent exception usage (L9) hurt. |
| **Organization** | 70/100 | Backend has a clear structure. Frontend uses Next.js App Router correctly. But the old `frontend/` directory, empty `utils/`, and hardcoded alembic URL are organizational failures. |
| **Maintainability** | 68/100 | Easy to understand for a new developer, but the fake scores (C2), broken logout (C1), and client-side AI (H3) make it hard to maintain in a production context. |
| **DX (Developer Experience)** | 75/100 | Good: `render.yaml`, `vercel.json`, `.env.example`, health check endpoint. Bad: no dev scripts, no linting config, no pre-commit hooks, no Docker. |

---

## OVERALL SCORE: 68/100

**Classification: Pleno (Mid-level)**

---

## HONEST ASSESSMENT

### O projeto está pronto para usuários reais?

**Não.** O produto tem uma UI bonita e a infraestrutura de deploy funciona, mas há problemas fundamentais que impedem uso real:

1. **Logout não funciona** (C1) — tokens permanecem válidos após "sair"
2. **Scores são aleatórios** (C2) — o produto principal (evaluation) retorna lixo
3. **AI é 100% client-side** (H3) — se Puter.js cair, o produto morre
4. **Refresh tokens não são rotacionados** (H1) — vulnerabilidade de segurança
5. **End interview sempre retorna 0** (H7) — nenhum score real é calculado

### Eu colocaria isso em produção?

**Não.** Os problemas C1, C2, e H7 são bloqueadores. Um usuário que faz logout continua autenticado. Os scores são inventados. A interview não gera avaliação real.

### Eu aprovaria este Pull Request?

**Não como está.** Um reviewer em uma Big Tech bloquearia por:
- C1: Logout não revoga tokens
- C2: Scores usam `Math.random()`
- H7: Score final sempre 0
- M1/M2: Dependências desnecessárias
- M4: Frontend morto no repo
- H5: Memory leak no rate limiter

### O que impede de ser Enterprise?

1. **Auth incompleta** — logout, refresh rotation, session management
2. **AI não é server-side** — viola princípios de segurança (prompt exposto)
3. **Sem testes de integração** — apenas 47 unit tests, nenhum E2E
4. **Sem observabilidade** — sem métricas, tracing, ou alertas
5. **Sem CI/CD** — nenhum pipeline de build/test/deploy automatizado
6. **Sem containerização** — sem Docker, sem health checks detalhados
7. **Sem rate limiting distribuído** — in-memory não funciona em multi-worker
8. **Sem audit logging** — não sabe quem fez o quê
9. **Sem data retention policy** — dados ficam para sempre
10. **Sem API versioning strategy** — `/api/v1` existe mas não há plano para v2

---

## WHAT'S ACTUALLY GOOD

- **Input validation** is thorough (Pydantic schemas, enum validators, length limits)
- **Security headers** are comprehensive (CSP, HSTS, Permissions-Policy)
- **Rate limiting** works correctly for single-worker deployment
- **CORS** is properly restricted
- **Password hashing** uses bcrypt with proper configuration
- **Async architecture** is correct (asyncpg, async session factory)
- **UI/UX** is polished with good animations and responsive design
- **CSS design system** is well-structured with CSS variables
- **Error handling** in the API client is thoughtful (retry on 401, network error handling)
- **Toast system** is clean and reusable
- **The codebase is readable** — a new developer could understand it in a day

---

*End of audit.*
