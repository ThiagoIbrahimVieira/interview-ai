from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, security
from app.services.user import UserService
from app.services.interview import InterviewService
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefresh,
    ProfileUpdate,
    ProfileResponse,
    PasswordChange,
)
from app.schemas.interview import (
    InterviewConfigCreate,
    InterviewSessionResponse,
    InterviewSessionList,
    MessageCreate,
    MessageResponse,
)
from app.schemas.report import ReportResponse, EvaluationRequest
from app.core.security import create_access_token, create_refresh_token, decode_token, revoke_token
from app.core.rate_limiter import get_rate_store
from app.core.secure_logging import SecureLogger
from app.models.user import User
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
secure = SecureLogger()
settings = get_settings()

router = APIRouter()


@router.post("/auth/register", response_model=UserResponse, status_code=201)
async def register(data: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    rate_store = get_rate_store()

    register_key = f"register:{client_ip}"
    if not rate_store.check_login_rate_limit(register_key, settings.MAX_LOGIN_ATTEMPTS, settings.LOCKOUT_MINUTES):
        logger.warning(f"Register rate limit exceeded ip={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again later.",
        )

    service = UserService(db)
    user = await service.register(data.email, data.password, data.full_name)
    await db.commit()
    rate_store.reset_login_attempts(register_key)
    logger.info(f"Register success ip={client_ip}")
    return user


@router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    rate_store = get_rate_store()

    login_key = f"login:{client_ip}"
    if not rate_store.check_login_rate_limit(login_key, settings.MAX_LOGIN_ATTEMPTS, settings.LOCKOUT_MINUTES):
        logger.warning(f"Login rate limit exceeded ip={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )

    service = UserService(db)
    user = await service.authenticate(data.email, data.password)

    rate_store.reset_login_attempts(login_key)

    access_token = create_access_token(data={"sub": str(user.id), "ver": user.token_version})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "ver": user.token_version})

    logger.info(f"Login success user_id={user.id} ip={client_ip}")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefresh, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        logger.warning(f"Invalid refresh token ip={client_ip}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("jti"):
        revoke_token(payload["jti"])

    user_id = payload.get("sub")
    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    service = UserService(db)
    user = await service.get_by_id(uid)

    access_token = create_access_token(data={"sub": str(user.id), "ver": user.token_version})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id), "ver": user.token_version})

    logger.info(f"Token refresh user_id={user.id} ip={client_ip}")
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


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


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/auth/change-password", status_code=204)
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    await service.change_password(current_user, data.current_password, data.new_password)
    await db.commit()
    logger.info(f"Password changed user_id={current_user.id}")


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    profile = await service.get_profile(current_user.id)
    return profile


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    if data.full_name is not None:
        current_user.full_name = data.full_name
        db.add(current_user)
    profile = await service.update_profile(
        current_user.id,
        job_title=data.job_title,
        country=data.country,
        experience_level=data.experience_level,
        bio=data.bio,
    )
    await db.commit()
    return profile


@router.post("/interviews/start", response_model=InterviewSessionResponse, status_code=201)
async def start_interview(
    data: InterviewConfigCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    session = await service.start_interview(current_user.id, data.model_dump())
    await db.commit()
    logger.info(f"Interview started user_id={current_user.id} session_id={session.id}")
    return session


@router.get("/interviews", response_model=InterviewSessionList)
async def list_interviews(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    sessions, total = await service.get_user_sessions(current_user.id, page, per_page)
    return InterviewSessionList(
        sessions=sessions, total=total, page=page, per_page=per_page
    )


@router.get("/interviews/{session_id}", response_model=InterviewSessionResponse)
async def get_interview(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    session = await service.get_session(session_id, current_user.id)
    return session


@router.post("/interviews/{session_id}/messages", response_model=MessageResponse, status_code=201)
async def add_message(
    session_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    message = await service.add_message(session_id, "user", data.content, current_user.id)
    await db.commit()
    return message


@router.get("/interviews/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    await service.get_session(session_id, current_user.id)
    messages = await service.get_messages(session_id)
    return messages


@router.post("/interviews/{session_id}/end", response_model=InterviewSessionResponse)
async def end_interview(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    session = await service.end_interview(session_id, current_user.id)
    await db.commit()
    logger.info(f"Interview ended user_id={current_user.id} session_id={session_id}")
    return session


@router.post("/interviews/{session_id}/evaluate", response_model=ReportResponse)
async def evaluate_interview(
    session_id: int,
    evaluation: EvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    report = await service.save_evaluation(
        session_id=session_id,
        user_id=current_user.id,
        overall_score=evaluation.overall_score,
        category_scores=evaluation.category_scores,
        strengths=evaluation.strengths,
        weaknesses=evaluation.weaknesses,
        improvements=evaluation.improvements,
    )
    logger.info(f"Interview evaluated user_id={current_user.id} session_id={session_id} score={evaluation.overall_score}")
    return report


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    stats = await service.get_user_stats(current_user.id)
    return stats


@router.get("/reports/{session_id}", response_model=ReportResponse)
async def get_report(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.report import ReportRepository

    service = InterviewService(db)
    await service.get_session(session_id, current_user.id)

    report_repo = ReportRepository(db)
    report = await report_repo.get_by_session_id(session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    scores = await report_repo.get_session_scores(session_id)
    report.scores = scores
    return report
