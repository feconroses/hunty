import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.models.enums import TaskQueue, TaskStatus, TaskType
from app.models.filter_rule import FilterRule
from app.models.job import Job
from app.models.linkedin_search import LinkedInSearch
from app.models.task import Task
from app.schemas.linkedin_search import (
    CreateLinkedInSearchRequest,
    UpdateLinkedInSearchRequest,
)
from app.services.activity_service import ActivityService

logger = logging.getLogger(__name__)

LINKEDIN_SEARCH_BASE = "https://www.linkedin.com/jobs/search-results/"

EMPLOYMENT_TYPE_IDS = {
    "full_time": "272015",
    "part_time": "273001",
    "contract": "274001",
    "internship": "275001",
    "volunteer": "272002",
}


def build_linkedin_url(search: LinkedInSearch, time_filter: str = "r86400") -> str:
    """Construct a LinkedIn AI-powered job search URL from search parameters."""
    params: dict[str, str] = {
        "keywords": search.keywords,
        "f_TPR": time_filter,
        "origin": "JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE",
        "geoId": search.geo_id,
    }
    if search.location:
        params["location"] = search.location
    if search.employment_types:
        ids = ",".join(
            EMPLOYMENT_TYPE_IDS[t]
            for t in search.employment_types
            if t in EMPLOYMENT_TYPE_IDS
        )
        if ids:
            params["f_SAL"] = f"f_SA_id_226001:{ids}"

    return f"{LINKEDIN_SEARCH_BASE}?{urlencode(params)}"


class LinkedInSearchService:
    """Service for managing LinkedIn searches."""

    @staticmethod
    async def list_searches(
        db: AsyncSession, user_id: int
    ) -> list[dict]:
        """List all LinkedIn searches for a user, including pending task count."""
        result = await db.execute(
            select(LinkedInSearch)
            .where(LinkedInSearch.user_id == user_id)
            .order_by(LinkedInSearch.created_at.desc())
        )
        searches = result.scalars().all()

        search_list = []
        for search in searches:
            task_count_result = await db.execute(
                select(func.count())
                .select_from(Task)
                .where(
                    Task.linkedin_search_id == search.id,
                    Task.user_id == user_id,
                    Task.status == TaskStatus.pending,
                )
            )
            pending_count = task_count_result.scalar() or 0

            search_dict = {
                "id": search.id,
                "user_id": search.user_id,
                "keywords": search.keywords,
                "location": search.location,
                "geo_id": search.geo_id,
                "employment_types": search.employment_types,
                "linkedin_url": search.linkedin_url,
                "is_active": search.is_active,
                "last_scanned_at": search.last_scanned_at,
                "jobs_found_count": search.jobs_found_count,
                "created_at": search.created_at,
                "updated_at": search.updated_at,
                "pending_tasks_count": pending_count,
            }
            search_list.append(search_dict)

        return search_list

    @staticmethod
    async def create_search(
        db: AsyncSession, user_id: int, data: CreateLinkedInSearchRequest
    ) -> dict:
        """Create a new LinkedIn search and build its URL."""
        search = LinkedInSearch(
            user_id=user_id,
            keywords=data.keywords.strip(),
            location=data.location.strip(),
            geo_id=data.geo_id.strip(),
            employment_types=data.employment_types or None,
        )
        search.linkedin_url = build_linkedin_url(search, time_filter="r604800")  # First scan: past week

        db.add(search)
        await db.flush()
        await db.refresh(search)

        # Auto-create scan_linkedin task
        task = Task(
            user_id=user_id,
            linkedin_search_id=search.id,
            task_type=TaskType.scan_linkedin,
            status=TaskStatus.pending,
            queue=TaskQueue.queue,
            queue_order=0,
        )
        db.add(task)
        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="linkedin_search_created",
            entity_type="linkedin_search",
            entity_id=search.id,
            details={"keywords": search.keywords, "location": search.location},
        )

        return {
            "id": search.id,
            "user_id": search.user_id,
            "keywords": search.keywords,
            "location": search.location,
            "geo_id": search.geo_id,
            "employment_types": search.employment_types,
            "linkedin_url": search.linkedin_url,
            "is_active": search.is_active,
            "last_scanned_at": search.last_scanned_at,
            "jobs_found_count": search.jobs_found_count,
            "created_at": search.created_at,
            "updated_at": search.updated_at,
            "pending_tasks_count": 1,
        }

    @staticmethod
    async def update_search(
        db: AsyncSession, user_id: int, search_id: int, data: UpdateLinkedInSearchRequest
    ) -> LinkedInSearch:
        """Update an existing LinkedIn search."""
        result = await db.execute(
            select(LinkedInSearch).where(
                LinkedInSearch.id == search_id, LinkedInSearch.user_id == user_id
            )
        )
        search = result.scalar_one_or_none()
        if search is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn search not found.",
            )

        if data.keywords is not None:
            search.keywords = data.keywords.strip()
        if data.location is not None:
            search.location = data.location.strip() if data.location else None
        if data.geo_id is not None:
            search.geo_id = data.geo_id.strip()
        if data.is_active is not None:
            search.is_active = data.is_active
        if data.employment_types is not None:
            search.employment_types = data.employment_types or None

        # Rebuild URL after any change
        search.linkedin_url = build_linkedin_url(search)

        db.add(search)
        await db.flush()
        await db.refresh(search)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="linkedin_search_updated",
            entity_type="linkedin_search",
            entity_id=search.id,
        )

        return search

    @staticmethod
    async def delete_search(
        db: AsyncSession, user_id: int, search_id: int
    ) -> None:
        """Delete a LinkedIn search and related data."""
        result = await db.execute(
            select(LinkedInSearch).where(
                LinkedInSearch.id == search_id, LinkedInSearch.user_id == user_id
            )
        )
        search = result.scalar_one_or_none()
        if search is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn search not found.",
            )

        # Delete related filter rules
        filter_result = await db.execute(
            select(FilterRule).where(
                FilterRule.linkedin_search_id == search_id,
                FilterRule.user_id == user_id,
            )
        )
        for rule in filter_result.scalars().all():
            await db.delete(rule)

        # Delete related tasks
        tasks_result = await db.execute(
            select(Task).where(
                Task.linkedin_search_id == search_id,
                Task.user_id == user_id,
            )
        )
        for task in tasks_result.scalars().all():
            await db.delete(task)

        # Unlink related jobs (keep them, just clear the FK)
        jobs_result = await db.execute(
            select(Job).where(
                Job.linkedin_search_id == search_id,
                Job.user_id == user_id,
            )
        )
        for job in jobs_result.scalars().all():
            job.linkedin_search_id = None
            db.add(job)

        search_name = search.keywords
        await db.delete(search)
        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="linkedin_search_deleted",
            entity_type="linkedin_search",
            entity_id=search_id,
            details={"name": search_name},
        )

    @staticmethod
    async def trigger_scan(
        db: AsyncSession, user_id: int, search_id: int
    ) -> dict:
        """Create a scan_linkedin task for a search."""
        result = await db.execute(
            select(LinkedInSearch).where(
                LinkedInSearch.id == search_id, LinkedInSearch.user_id == user_id
            )
        )
        search = result.scalar_one_or_none()
        if search is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn search not found.",
            )

        # Rebuild URL to ensure it's fresh
        search.linkedin_url = build_linkedin_url(search)
        db.add(search)

        task = Task(
            user_id=user_id,
            linkedin_search_id=search.id,
            task_type=TaskType.scan_linkedin,
            status=TaskStatus.pending,
            queue=TaskQueue.queue,
            queue_order=0,
        )
        db.add(task)
        await db.flush()
        await db.refresh(task)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="task_created",
            entity_type="task",
            entity_id=task.id,
            details={"task_type": "scan_linkedin", "linkedin_search_id": search_id},
        )

        # Return enriched task
        from app.services.task_service import TaskService
        return await TaskService._enrich_task(db, task, user_id)
