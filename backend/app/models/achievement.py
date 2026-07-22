from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    icon = Column(String(100), nullable=True)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="achievements")
