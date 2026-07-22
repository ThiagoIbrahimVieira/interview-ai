from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
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
from app.schemas.report import ReportResponse
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import User

router = APIRouter()


@router.post("/auth/register", response_model=UserResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    user = await service.register(data.email, data.password, data.full_name)
    return user


@router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    user = await service.authenticate(data.email, data.password)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    service = UserService(db)
    user = await service.get_by_id(int(user_id))

    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


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
    return profile


@router.post("/interviews/start", response_model=InterviewSessionResponse, status_code=201)
async def start_interview(
    data: InterviewConfigCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InterviewService(db)
    session = await service.start_interview(current_user.id, data.model_dump())
    return session


@router.get("/interviews", response_model=InterviewSessionList)
async def list_interviews(
    page: int = 1,
    per_page: int = 10,
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
    await service.get_session(session_id, current_user.id)
    message = await service.add_message(session_id, "user", data.content)
    return message


@router.get("/interviews/{session_id}/messages")
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
    return session


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
    return report
