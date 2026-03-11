from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, DateTime, Float, Integer, ForeignKey, JSON, Text, func
from sqlmodel import Field, SQLModel

from app.models.enums import SeniorityLevel, WorkType


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False))
    company_id: int = Field(
        sa_column=Column(Integer, ForeignKey("companies.id"), nullable=False)
    )
    title: str = Field(max_length=500)
    url: Optional[str] = Field(default=None, max_length=1024)
    location: Optional[str] = Field(default=None, max_length=255)
    work_type: Optional[WorkType] = Field(default=None)
    salary_min: Optional[float] = Field(default=None)
    salary_max: Optional[float] = Field(default=None)
    salary_currency: Optional[str] = Field(default="USD", max_length=10)
    seniority_level: Optional[SeniorityLevel] = Field(default=None)
    department: Optional[str] = Field(default=None, max_length=255)
    skills: Any = Field(default=[], sa_column=Column(JSON, nullable=False, server_default="[]"))
    description_summary: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    full_description: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    notes: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    kanban_stage_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("kanban_stages.id"), nullable=True),
    )
    kanban_order: float = Field(default=0)
    discovered_at: datetime = Field(
        sa_column=Column(DateTime, server_default=func.now(), nullable=False),
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=func.now(), nullable=False),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
        ),
    )
