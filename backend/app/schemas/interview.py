from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re


class InterviewConfigCreate(BaseModel):
    job_title: str = Field(..., max_length=255)
    language: str = Field(default="English", max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    experience_level: str = Field(default="Mid-Level", max_length=50)
    interview_type: str = Field(default="Mixed", max_length=50)
    company_style: str = Field(default="Big Tech", max_length=50)
    difficulty: str = Field(default="Medium", max_length=50)
    duration_minutes: int = Field(default=30, ge=5, le=120)
    custom_instructions: Optional[str] = Field(None, max_length=2000)

    @field_validator("job_title")
    @classmethod
    def validate_job_title(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Job title is required")
        if len(v) > 255:
            raise ValueError("Job title too long")
        return v

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        allowed = ["English", "Spanish", "Portuguese", "French", "German", "Japanese", "Chinese"]
        if v not in allowed:
            raise ValueError(f"Language must be one of: {', '.join(allowed)}")
        return v

    @field_validator("experience_level")
    @classmethod
    def validate_experience_level(cls, v):
        allowed = ["Junior", "Mid-Level", "Senior", "Specialist"]
        if v not in allowed:
            raise ValueError(f"Experience level must be one of: {', '.join(allowed)}")
        return v

    @field_validator("interview_type")
    @classmethod
    def validate_interview_type(cls, v):
        allowed = ["Technical", "Behavioral", "HR", "Mixed"]
        if v not in allowed:
            raise ValueError(f"Interview type must be one of: {', '.join(allowed)}")
        return v

    @field_validator("company_style")
    @classmethod
    def validate_company_style(cls, v):
        allowed = ["Startup", "Big Tech", "Bank", "Healthcare", "Government", "Retail", "Custom"]
        if v not in allowed:
            raise ValueError(f"Company style must be one of: {', '.join(allowed)}")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        allowed = ["Easy", "Medium", "Hard", "Expert"]
        if v not in allowed:
            raise ValueError(f"Difficulty must be one of: {', '.join(allowed)}")
        return v

    @field_validator("custom_instructions")
    @classmethod
    def validate_custom_instructions(cls, v):
        if v and len(v.strip()) > 2000:
            raise ValueError("Custom instructions too long (max 2000 characters)")
        return v


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
    content: str = Field(..., min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Message content cannot be empty")
        return v


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
