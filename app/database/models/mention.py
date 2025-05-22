from sqlalchemy import Column, Integer, Boolean, TIMESTAMP, CheckConstraint
from sqlalchemy.sql import func
from app.database.session import Base


class Mention(Base):
    __tablename__ = "mentions"
    __table_args__ = (
        CheckConstraint("end_pos > start_pos", name="check_positions"),
        CheckConstraint("start_pos >= 0", name="check_start_pos"),
    )

    id = Column(Integer, primary_key=True)
    annotation_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    start_pos = Column(Integer, nullable=False)
    end_pos = Column(Integer, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    deleted_at = Column(TIMESTAMP)
