from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InterviewConfigCreate(BaseModel):
    job_title: str = Field(..., max_length=255)
    language: str = "English"
    country: Optional[str] = None
    experience_level: str = "Mid-Level"
    interview_type: str = "Mixed"
    company_style: str = "Big Tech"
    difficulty: str = "Medium"
    duration_minutes: int = 30
    custom_instructions: Optional[str] = None


class InterviewConfigResponse(BaseModel):
    id: int
    job_title: str
    language: str
    country: Optional[str]
    experience_level: str
    interview_type: str
    company_style: str
    difficulty: str
    duration_minutes: int
    custom_instructions: Optional[str]

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: Optional[datetime]
    duration_ms: Optional[int]

    model_config = {"from_attributes": True}


class InterviewSessionResponse(BaseModel):
    id: int
    user_id: int
    config_id: Optional[int]
    status: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: int
    final_score: Optional[float]
    summary: Optional[str]
    created_at: Optional[datetime]
    config: Optional[InterviewConfigResponse]
    message_count: int = 0

    model_config = {"from_attributes": True}


class InterviewSessionList(BaseModel):
    sessions: List[InterviewSessionResponse]
    total: int
    page: int
    per_page: int
