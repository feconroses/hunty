from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class CreateCompanyRequest(BaseModel):
    name: str
    url: str


class UpdateCompanyRequest(BaseModel):
    name: str | None = None
    url: str | None = None
    careers_page_url: str | None = None
    status: str | None = None


class CompanyResponse(BaseModel):
    id: int
    user_id: int
    name: str
    url: str | None = None
    careers_page_url: str | None = None
    source: str = "target"
    status: str
    last_scanned_at: datetime | None = None
    jobs_found_count: int = 0
    created_at: datetime
    updated_at: datetime
    pending_tasks_count: int | None = None

    model_config = {"from_attributes": True}
