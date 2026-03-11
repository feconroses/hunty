from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, DateTime, Integer, ForeignKey, JSON, String, func
from sqlmodel import Field, SQLModel


class ActivityLog(SQLModel, table=True):
    __tablename__ = "activity_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False))
    action: str = Field(max_length=255)
    entity_type: Optional[str] = Field(default=None, max_length=100)
    entity_id: Optional[int] = Field(default=None)
    details: Optional[Any] = Field(default=None, sa_column=Column(JSON, nullable=True))
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=func.now(), nullable=False),
    )
