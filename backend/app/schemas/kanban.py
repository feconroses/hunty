from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateKanbanStageRequest(BaseModel):
    name: str
    color: str | None = "#6366f1"
    order: int | None = None


class UpdateKanbanStageRequest(BaseModel):
    name: str | None = None
    color: str | None = None


class ReorderKanbanStageItem(BaseModel):
    id: int
    order: int


class ReorderKanbanStagesRequest(BaseModel):
    items: list[ReorderKanbanStageItem]


class KanbanStageResponse(BaseModel):
    id: int
    user_id: int
    name: str
    order: int
    color: str
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}
