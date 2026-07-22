from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=255)


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    country: Optional[str] = None
    experience_level: Optional[str] = None
    bio: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    job_title: Optional[str]
    country: Optional[str]
    experience_level: Optional[str]
    bio: Optional[str]
    streak: int
    total_interviews: int
    average_score: int

    model_config = {"from_attributes": True}
