from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Integer, ForeignKey, func
from sqlmodel import Field, SQLModel


class KanbanStage(SQLModel, table=True):
    __tablename__ = "kanban_stages"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False))
    name: str = Field(max_length=100)
    order: int = Field(default=0)
    color: str = Field(default="#6366f1", max_length=20)
    is_default: bool = Field(default=True)
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=func.now(), nullable=False),
    )
