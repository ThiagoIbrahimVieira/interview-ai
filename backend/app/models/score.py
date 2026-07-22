from sqlalchemy import Column, Integer, DateTime, ForeignKey, Float, String, func
from sqlalchemy.orm import relationship
from app.database import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    category = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=100.0)
    feedback = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("InterviewSession", back_populates="scores")
