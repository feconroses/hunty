from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Integer, ForeignKey, String, func
from sqlmodel import Field, SQLModel

from app.models.enums import CompanyStatus


class Company(SQLModel, table=True):
    __tablename__ = "companies"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False))
    name: str = Field(max_length=255)
    url: str = Field(max_length=512)
    careers_page_url: Optional[str] = Field(default=None, max_length=512)
    status: CompanyStatus = Field(default=CompanyStatus.pending)
    last_scanned_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
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
