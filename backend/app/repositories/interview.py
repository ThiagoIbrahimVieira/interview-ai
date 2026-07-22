from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.models.interview import InterviewSession, Message, InterviewConfig
from datetime import date, timedelta
from typing import Optional, List, Tuple


class InterviewRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_config(self, config: InterviewConfig) -> InterviewConfig:
        self.db.add(config)
        await self.db.flush()
        return config

    async def create_session(self, session: InterviewSession) -> InterviewSession:
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session, ["config"])
        return session

    async def get_session(self, session_id: int) -> Optional[InterviewSession]:
        result = await self.db.execute(
            select(InterviewSession)
            .where(InterviewSession.id == session_id)
            .options(selectinload(InterviewSession.config))
        )
        return result.scalar_one_or_none()

    async def get_user_sessions(
        self, user_id: int, page: int = 1, per_page: int = 10
    ) -> Tuple[List[InterviewSession], int]:
        count_result = await self.db.execute(
            select(func.count(InterviewSession.id)).where(
                InterviewSession.user_id == user_id
            )
        )
        total = count_result.scalar()

        result = await self.db.execute(
            select(InterviewSession)
            .where(InterviewSession.user_id == user_id)
            .options(selectinload(InterviewSession.config))
            .order_by(desc(InterviewSession.created_at))
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        sessions = list(result.scalars().all())
        return sessions, total

    async def update_session(self, session: InterviewSession, **kwargs) -> InterviewSession:
        for key, value in kwargs.items():
            setattr(session, key, value)
        await self.db.flush()
        return session

    async def add_message(self, message: Message) -> Message:
        self.db.add(message)
        await self.db.flush()
        return message

    async def get_session_messages(self, session_id: int) -> List[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.timestamp)
        )
        return list(result.scalars().all())

    async def get_user_stats(self, user_id: int) -> dict:
        result = await self.db.execute(
            select(
                func.count(InterviewSession.id),
                func.coalesce(func.avg(InterviewSession.final_score), 0),
            ).where(
                InterviewSession.user_id == user_id,
                InterviewSession.status == "completed",
            )
        )
        row = result.one()
        total_interviews = row[0]
        average_score = float(row[1]) if row[1] else 0.0

        completed_sessions = await self.db.execute(
            select(InterviewSession)
            .where(
                InterviewSession.user_id == user_id,
                InterviewSession.status == "completed",
                InterviewSession.ended_at.isnot(None),
            )
            .order_by(desc(InterviewSession.ended_at))
        )
        sessions = list(completed_sessions.scalars().all())

        streak = 0
        improvement = 0.0

        if sessions:
            seen_dates = set()
            for s in sessions:
                d = s.ended_at.date() if s.ended_at else None
                if d:
                    seen_dates.add(d)

            sorted_dates = sorted(seen_dates, reverse=True)
            today = date.today()
            expected = today
            for d in sorted_dates:
                if d == expected:
                    streak += 1
                    expected -= timedelta(days=1)
                elif d == expected - timedelta(days=1):
                    streak += 1
                    expected = d - timedelta(days=1)
                else:
                    break

            scores = [s.final_score for s in sessions if s.final_score is not None]
            if len(scores) >= 2:
                midpoint = len(scores) // 2
                recent_avg = sum(scores[:midpoint]) / midpoint if midpoint else 0
                older_count = len(scores) - midpoint
                older_avg = sum(scores[midpoint:]) / older_count if older_count else 0
                if older_avg > 0:
                    improvement = ((recent_avg - older_avg) / older_avg) * 100

        return {
            "total_interviews": total_interviews,
            "average_score": average_score,
            "streak": streak,
            "improvement": round(improvement, 1),
        }
