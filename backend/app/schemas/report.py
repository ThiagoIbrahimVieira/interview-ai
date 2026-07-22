from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ScoreResponse(BaseModel):
    id: int
    session_id: int
    category: str
    score: float
    max_score: float
    feedback: Optional[str]

    model_config = {"from_attributes": True}


class ReportResponse(BaseModel):
    id: int
    session_id: int
    overall_score: Optional[int]
    strengths: Optional[str]
    weaknesses: Optional[str]
    improvements: Optional[str]
    detailed_feedback: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int


class DashboardStats(BaseModel):
    total_interviews: int
    average_score: float
    streak: int
    recent_scores: List[float]
    category_scores: dict
