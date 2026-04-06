from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Integer, ForeignKey, JSON, Text, func
from sqlmodel import Field, SQLModel


class LinkedInSearch(SQLModel, table=True):
    __tablename__ = "linkedin_searches"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False))
    keywords: str = Field(max_length=500)
    location: Optional[str] = Field(default=None, max_length=255)
    geo_id: str = Field(max_length=50)
    employment_types: Optional[list[str]] = Field(
        default=None, sa_column=Column(JSON, nullable=True)
    )
    linkedin_url: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    is_active: bool = Field(default=True)
    last_scanned_at: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, nullable=True)
    )
    jobs_found_count: int = Field(default=0)
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=func.now(), nullable=False),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
        ),
    )
