from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class CheckJobUrlRequest(BaseModel):
    company_id: int
    url: str


class CreateJobRequest(BaseModel):
    company_id: int
    title: str
    url: str | None = None
    location: str | None = None
    work_type: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = "USD"
    seniority_level: str | None = None
    department: str | None = None
    skills: list[str] = []
    description_summary: str | None = None
    full_description: str | None = None
    kanban_stage_id: int | None = None
    kanban_order: float = 0


class UpdateJobRequest(BaseModel):
    title: str | None = None
    url: str | None = None
    location: str | None = None
    work_type: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    seniority_level: str | None = None
    department: str | None = None
    skills: list[str] | None = None
    description_summary: str | None = None
    full_description: str | None = None
    kanban_stage_id: int | None = None
    kanban_order: float | None = None
    notes: str | None = None


class ReorderJobItem(BaseModel):
    id: int
    kanban_stage_id: int
    kanban_order: float


class ReorderJobsRequest(BaseModel):
    items: list[ReorderJobItem]


class JobResponse(BaseModel):
    id: int
    user_id: int
    company_id: int
    title: str
    url: str | None = None
    location: str | None = None
    work_type: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = "USD"
    seniority_level: str | None = None
    department: str | None = None
    skills: list[Any] = []
    description_summary: str | None = None
    full_description: str | None = None
    notes: str | None = None
    kanban_stage_id: int | None = None
    kanban_order: float = 0
    discovered_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
