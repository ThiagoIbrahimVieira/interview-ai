from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class ScoreResponse(BaseModel):
    id: int
    session_id: int
    category: str
    score: float
    max_score: float
    feedback: Optional[str]

    model_config = {"from_attributes": True}


class CategoryScore(BaseModel):
    score: float
    feedback: Optional[str] = ""


class EvaluationRequest(BaseModel):
    overall_score: int
    category_scores: Dict[str, CategoryScore]
    strengths: str
    weaknesses: str
    improvements: str


class ReportResponse(BaseModel):
    id: int
    session_id: int
    overall_score: Optional[int]
    strengths: Optional[str]
    weaknesses: Optional[str]
    improvements: Optional[str]
    detailed_feedback: Optional[str]
    scores: List[ScoreResponse] = []
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
