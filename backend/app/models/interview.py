from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from app.database import Base


class InterviewConfig(Base):
    __tablename__ = "interview_configs"

    id = Column(Integer, primary_key=True, index=True)
    job_title = Column(String(255), nullable=False)
    language = Column(String(50), default="English")
    country = Column(String(100), nullable=True)
    experience_level = Column(String(50), default="Mid-Level")
    interview_type = Column(String(50), default="Mixed")
    company_style = Column(String(50), default="Big Tech")
    difficulty = Column(String(50), default="Medium")
    duration_minutes = Column(Integer, default=30)
    custom_instructions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    config_id = Column(Integer, ForeignKey("interview_configs.id"), nullable=True)
    status = Column(String(50), default="pending")
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)
    final_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interviews")
    config = relationship("InterviewConfig")
    messages = relationship("Message", back_populates="session")
    scores = relationship("Score", back_populates="session")
    report = relationship("Report", back_populates="session", uselist=False)

    @hybrid_property
    def message_count(self):
        try:
            return len(self.messages) if self.messages else 0
        except Exception:
            return 0


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    duration_ms = Column(Integer, nullable=True)

    session = relationship("InterviewSession", back_populates="messages")
