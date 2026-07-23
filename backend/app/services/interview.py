from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.interview import InterviewRepository
from app.repositories.report import ReportRepository
from app.models.interview import InterviewSession, InterviewConfig, Message
from app.models.report import Report
from app.models.score import Score
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
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
        self, session_id: int, role: str, content: str, user_id: int
    ) -> Message:
        if role not in ("user", "assistant", "system"):
            raise ValidationException(f"Invalid message role: {role}")

        session = await self.get_session(session_id, user_id)
        if session.status != "active":
            raise ValidationException("Interview is not active")

        message = Message(
            session_id=session_id,
            role=role,
            content=content,
        )
        return await self.repo.add_message(message)

    async def get_messages(self, session_id: int):
        return await self.repo.get_session_messages(session_id)

    async def end_interview(self, session_id: int, user_id: int) -> InterviewSession:
        session = await self.get_session(session_id, user_id)
        if session.status == "completed":
            return session

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
        )

        existing_report = await self.report_repo.get_by_session_id(session_id)
        if not existing_report:
            messages = await self.get_messages(session_id)
            user_messages = [m for m in messages if m.role == "user"]
            msg_count = len(user_messages)

            if msg_count == 0:
                overall_score = 0
                strengths = "- No responses provided during the interview"
                weaknesses = "- Interview was not completed"
                improvements = "- Practice answering interview questions"
            else:
                avg_length = sum(len(m.content) for m in user_messages) / msg_count
                if avg_length > 200:
                    overall_score = 75
                    strengths = "- Provided detailed and thoughtful responses\n- Demonstrated good communication skills\n- Showed relevant knowledge"
                    weaknesses = "- Could be more concise in some answers"
                    improvements = "- Practice structuring answers more concisely"
                elif avg_length > 100:
                    overall_score = 60
                    strengths = "- Provided relevant responses\n- Showed basic understanding of topics"
                    weaknesses = "- Answers could be more detailed\n- Could provide more specific examples"
                    improvements = "- Elaborate more on technical experiences\n- Use the STAR method for behavioral questions"
                else:
                    overall_score = 40
                    strengths = "- Participated in the interview"
                    weaknesses = "- Responses were too brief\n- Lacked detail and specific examples"
                    improvements = "- Prepare more detailed answers\n- Practice explaining concepts thoroughly"

            report = Report(
                session_id=session_id,
                overall_score=overall_score,
                strengths=strengths,
                weaknesses=weaknesses,
                improvements=improvements,
                detailed_feedback=None,
            )
            await self.report_repo.create_report(report)

            categories = {
                "technical_knowledge": max(0, overall_score - 5),
                "communication": max(0, overall_score + 5),
                "problem_solving": max(0, overall_score - 3),
                "confidence": max(0, overall_score + 2),
            }
            for cat_name, cat_score in categories.items():
                await self.add_score(
                    session_id=session_id,
                    category=cat_name,
                    score=min(100, cat_score),
                    feedback="",
                )

            await self.repo.update_session(session, final_score=overall_score)

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
        if not 0.0 <= score <= 100.0:
            raise ValidationException("Score must be between 0 and 100")
        s = Score(
            session_id=session_id,
            category=category,
            score=score,
            feedback=feedback,
        )
        return await self.report_repo.create_score(s)

    async def save_evaluation(
        self,
        session_id: int,
        user_id: int,
        overall_score: int,
        category_scores: dict,
        strengths: str,
        weaknesses: str,
        improvements: str,
    ) -> Report:
        session = await self.get_session(session_id, user_id)

        existing = await self.report_repo.get_by_session_id(session_id)
        if existing:
            existing.overall_score = overall_score
            existing.strengths = strengths
            existing.weaknesses = weaknesses
            existing.improvements = improvements
            await self.db.flush()
            
            await self.report_repo.delete_scores_by_session(session_id)
            for cat_name, cat_data in category_scores.items():
                await self.add_score(
                    session_id=session_id,
                    category=cat_name,
                    score=cat_data["score"],
                    feedback=cat_data.get("feedback", ""),
                )
            
            await self.repo.update_session(session, final_score=overall_score)
            await self.db.commit()
            return existing

        report = Report(
            session_id=session_id,
            overall_score=overall_score,
            strengths=strengths,
            weaknesses=weaknesses,
            improvements=improvements,
            detailed_feedback=None,
        )
        await self.report_repo.create_report(report)

        for cat_name, cat_data in category_scores.items():
            await self.add_score(
                session_id=session_id,
                category=cat_name,
                score=cat_data["score"],
                feedback=cat_data.get("feedback", ""),
            )

        await self.repo.update_session(session, final_score=overall_score)
        await self.db.commit()

        return report

    async def get_user_stats(self, user_id: int) -> dict:
        return await self.repo.get_user_stats(user_id)
