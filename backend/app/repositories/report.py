from sqlalchemy.ext.asyncio import AsyncSession
from app.models.report import Report
from app.models.score import Score
from typing import Optional, List


class ReportRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_report(self, report: Report) -> Report:
        self.db.add(report)
        await self.db.flush()
        return report

    async def get_by_session_id(self, session_id: int) -> Optional[Report]:
        from sqlalchemy import select
        result = await self.db.execute(
            select(Report).where(Report.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def create_score(self, score: Score) -> Score:
        self.db.add(score)
        await self.db.flush()
        return score

    async def get_session_scores(self, session_id: int) -> List[Score]:
        from sqlalchemy import select
        result = await self.db.execute(
            select(Score).where(Score.session_id == session_id)
        )
        return list(result.scalars().all())
