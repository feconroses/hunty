from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateFilterRequest(BaseModel):
    company_id: int | None = None
    rule_type: str
    value: str


class UpdateFilterRequest(BaseModel):
    rule_type: str | None = None
    value: str | None = None


class FilterRuleResponse(BaseModel):
    id: int
    user_id: int
    company_id: int | None = None
    rule_type: str
    value: str
    created_at: datetime

    model_config = {"from_attributes": True}
