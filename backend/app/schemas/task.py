from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class CreateTaskRequest(BaseModel):
    company_id: int | None = None
    task_type: str


class CompleteTaskRequest(BaseModel):
    notes: str | None = None
    result_data: dict | None = None


class FailTaskRequest(BaseModel):
    notes: str | None = None


class BulkMoveTasksRequest(BaseModel):
    task_ids: list[int]
    target_queue: str


class ReorderTaskItem(BaseModel):
    id: int
    queue_order: float


class ReorderTasksRequest(BaseModel):
    items: list[ReorderTaskItem]


class TaskResponse(BaseModel):
    id: int
    user_id: int
    company_id: int | None = None
    task_type: str
    status: str
    queue: str
    queue_order: float = 0
    parent_task_id: int | None = None
    notes: str | None = None
    result_data: Any = None
    scheduled_for: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    # Enrichment fields (populated by service, not stored in DB)
    company_name: str | None = None
    company_url: str | None = None
    careers_page_url: str | None = None
    filter_criteria: str | None = None

    model_config = {"from_attributes": True}
