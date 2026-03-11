from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Integer, ForeignKey, Text, func
from sqlmodel import Field, SQLModel

class FilterRule(SQLModel, table=True):
    __tablename__ = "filter_rules"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False))
    company_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("companies.id"), nullable=True),
    )
    rule_type: str = Field(max_length=50)
    value: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=func.now(), nullable=False),
    )
