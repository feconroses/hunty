from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateLinkedInSearchRequest(BaseModel):
    keywords: str
    location: str
    geo_id: str
    employment_types: list[str] | None = None


class UpdateLinkedInSearchRequest(BaseModel):
    keywords: str | None = None
    location: str | None = None
    geo_id: str | None = None
    is_active: bool | None = None
    employment_types: list[str] | None = None


class LinkedInSearchResponse(BaseModel):
    id: int
    user_id: int
    keywords: str
    location: str | None = None
    geo_id: str | None = None
    employment_types: list[str] | None = None
    linkedin_url: str | None = None
    is_active: bool = True
    last_scanned_at: datetime | None = None
    jobs_found_count: int = 0
    pending_tasks_count: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
