from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), unique=True, nullable=False)
    overall_score = Column(Integer, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    improvements = Column(Text, nullable=True)
    detailed_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("InterviewSession", back_populates="report")
