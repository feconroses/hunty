from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateFilterRequest(BaseModel):
    company_id: int | None = None
    linkedin_search_id: int | None = None
    rule_type: str
    value: str
    logic_group: str | None = None


class UpdateFilterRequest(BaseModel):
    rule_type: str | None = None
    value: str | None = None
    logic_group: str | None = None


class FilterRuleResponse(BaseModel):
    id: int
    user_id: int
    company_id: int | None = None
    linkedin_search_id: int | None = None
    rule_type: str
    value: str
    logic_group: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SectionOrderRequest(BaseModel):
    sections: list[str]


class SectionOrderResponse(BaseModel):
    sections: list[str]
