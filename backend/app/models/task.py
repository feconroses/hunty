from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, DateTime, Float, Integer, ForeignKey, JSON, Text, func
from sqlmodel import Field, SQLModel

from app.models.enums import TaskQueue, TaskStatus, TaskType


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False))
    company_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("companies.id"), nullable=True),
    )
    task_type: TaskType
    status: TaskStatus = Field(default=TaskStatus.pending)
    queue: TaskQueue = Field(default=TaskQueue.queue)
    queue_order: float = Field(default=0)
    parent_task_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("tasks.id"), nullable=True),
    )
    notes: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    result_data: Optional[Any] = Field(
        default=None, sa_column=Column(JSON, nullable=True)
    )
    scheduled_for: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, nullable=True)
    )
    completed_at: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, nullable=True)
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=func.now(), nullable=False),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
        ),
    )
