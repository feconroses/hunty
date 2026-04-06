from typing import Optional

from sqlalchemy import Column, Integer, ForeignKey, Text
from sqlmodel import Field, SQLModel


class FilterSectionOrder(SQLModel, table=True):
    __tablename__ = "filter_section_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(
            Integer, ForeignKey("users.id"), nullable=False, unique=True
        )
    )
    sections: str = Field(
        sa_column=Column(Text, nullable=False)
    )  # JSON array of section keys
