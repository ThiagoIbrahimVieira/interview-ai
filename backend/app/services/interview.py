from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.interview import InterviewRepository
from app.repositories.report import ReportRepository
from app.models.interview import InterviewSession, InterviewConfig, Message
from app.models.report import Report
from app.models.score import Score
from app.core.exceptions import NotFoundException, ForbiddenException
from datetime import datetime, timezone
from typing import Optional


class InterviewService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InterviewRepository(db)
        self.report_repo = ReportRepository(db)

    async def create_config(self, config_data: dict) -> InterviewConfig:
        config = InterviewConfig(**config_data)
        return await self.repo.create_config(config)

    async def start_interview(self, user_id: int, config_data: dict) -> InterviewSession:
        config = await self.create_config(config_data)

        session = InterviewSession(
            user_id=user_id,
            config_id=config.id,
            status="active",
            started_at=datetime.now(timezone.utc),
        )
        return await self.repo.create_session(session)

    async def get_session(self, session_id: int, user_id: int) -> InterviewSession:
        session = await self.repo.get_session(session_id)
        if not session:
            raise NotFoundException("Interview session not found")
        if session.user_id != user_id:
            raise ForbiddenException("Not authorized to access this session")
        return session

    async def get_user_sessions(self, user_id: int, page: int = 1, per_page: int = 10):
        return await self.repo.get_user_sessions(user_id, page, per_page)

    async def add_message(
        self, session_id: int, role: str, content: str
    ) -> Message:
        message = Message(
            session_id=session_id,
            role=role,
            content=content,
        )
        return await self.repo.add_message(message)

    async def get_messages(self, session_id: int):
        return await self.repo.get_session_messages(session_id)

    async def end_interview(self, session_id: int, user_id: int, final_score: float = 0.0) -> InterviewSession:
        session = await self.get_session(session_id, user_id)
        duration = 0
        if session.started_at:
            started = session.started_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            duration = int((datetime.now(timezone.utc) - started).total_seconds())

        await self.repo.update_session(
            session,
            status="completed",
            ended_at=datetime.now(timezone.utc),
            duration_seconds=duration,
            final_score=final_score,
        )
        return session

    async def generate_report(
        self, session_id: int, overall_score: int, strengths: str, weaknesses: str, improvements: str, detailed_feedback: str
    ) -> Report:
        existing = await self.report_repo.get_by_session_id(session_id)
        if existing:
            return existing

        report = Report(
            session_id=session_id,
            overall_score=overall_score,
            strengths=strengths,
            weaknesses=weaknesses,
            improvements=improvements,
            detailed_feedback=detailed_feedback,
        )
        return await self.report_repo.create_report(report)

    async def add_score(self, session_id: int, category: str, score: float, feedback: str = "") -> Score:
        s = Score(
            session_id=session_id,
            category=category,
            score=score,
            feedback=feedback,
        )
        return await self.report_repo.create_score(s)

    async def get_user_stats(self, user_id: int) -> dict:
        return await self.repo.get_user_stats(user_id)
