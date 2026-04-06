import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.models.company import Company
from app.models.job import Job
from app.models.enums import SeniorityLevel, WorkType
from app.schemas.job import (
    CreateJobRequest,
    ReorderJobsRequest,
    UpdateJobRequest,
)
from app.services.activity_service import ActivityService

logger = logging.getLogger(__name__)


class JobService:
    """Service for managing jobs."""

    @staticmethod
    async def list_jobs(
        db: AsyncSession,
        user_id: int,
        kanban_stage_id: Optional[int] = None,
        company_id: Optional[int] = None,
        work_type: Optional[str] = None,
        seniority_level: Optional[str] = None,
        location: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """List jobs for a user with optional filters and pagination."""
        query = select(Job).where(Job.user_id == user_id)

        if kanban_stage_id is not None:
            query = query.where(Job.kanban_stage_id == kanban_stage_id)
        if company_id is not None:
            query = query.where(Job.company_id == company_id)
        if work_type is not None:
            try:
                query = query.where(Job.work_type == WorkType(work_type))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid work_type: {work_type}",
                )
        if seniority_level is not None:
            try:
                query = query.where(Job.seniority_level == SeniorityLevel(seniority_level))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid seniority_level: {seniority_level}",
                )
        if location is not None and location.strip():
            query = query.where(Job.location.ilike(f"%{location.strip()}%"))
        if search is not None and search.strip():
            query = query.where(Job.title.ilike(f"%{search.strip()}%"))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Apply ordering and pagination
        query = query.order_by(Job.kanban_order, Job.created_at.desc())
        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        jobs = list(result.scalars().all())

        return {
            "items": jobs,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    @staticmethod
    async def create_job(
        db: AsyncSession, user_id: int, data: CreateJobRequest
    ) -> Job:
        """Create a new job."""
        # Verify company ownership if company_id provided
        if data.company_id is not None:
            company_result = await db.execute(
                select(Company).where(
                    Company.id == data.company_id, Company.user_id == user_id
                )
            )
            if company_result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Company not found.",
                )

        job = Job(
            user_id=user_id,
            company_id=data.company_id,
            title=data.title.strip(),
            url=data.url,
            location=data.location,
            work_type=WorkType(data.work_type) if data.work_type else None,
            salary_min=data.salary_min,
            salary_max=data.salary_max,
            salary_currency=data.salary_currency,
            seniority_level=SeniorityLevel(data.seniority_level) if data.seniority_level else None,
            department=data.department,
            skills=data.skills,
            description_summary=data.description_summary,
            full_description=data.full_description,
            kanban_stage_id=data.kanban_stage_id,
            kanban_order=data.kanban_order,
        )
        db.add(job)
        await db.flush()
        await db.refresh(job)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="job_created",
            entity_type="job",
            entity_id=job.id,
            details={"title": job.title, "company_id": job.company_id},
        )

        return job

    @staticmethod
    async def update_job(
        db: AsyncSession, user_id: int, job_id: int, data: UpdateJobRequest
    ) -> Job:
        """Update an existing job."""
        result = await db.execute(
            select(Job).where(Job.id == job_id, Job.user_id == user_id)
        )
        job = result.scalar_one_or_none()
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found.",
            )

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "work_type" and value is not None:
                value = WorkType(value)
            elif field == "seniority_level" and value is not None:
                value = SeniorityLevel(value)
            setattr(job, field, value)

        db.add(job)
        await db.flush()
        await db.refresh(job)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="job_updated",
            entity_type="job",
            entity_id=job.id,
        )

        return job

    @staticmethod
    async def delete_job(
        db: AsyncSession, user_id: int, job_id: int
    ) -> None:
        """Delete a job."""
        result = await db.execute(
            select(Job).where(Job.id == job_id, Job.user_id == user_id)
        )
        job = result.scalar_one_or_none()
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found.",
            )

        job_title = job.title
        await db.delete(job)
        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="job_deleted",
            entity_type="job",
            entity_id=job_id,
            details={"title": job_title},
        )

    @staticmethod
    async def reorder_jobs(
        db: AsyncSession, user_id: int, data: ReorderJobsRequest
    ) -> list[Job]:
        """Reorder jobs by updating their kanban stage and order."""
        updated_jobs = []
        for item in data.items:
            result = await db.execute(
                select(Job).where(Job.id == item.id, Job.user_id == user_id)
            )
            job = result.scalar_one_or_none()
            if job is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job with id {item.id} not found.",
                )
            job.kanban_stage_id = item.kanban_stage_id
            job.kanban_order = item.kanban_order
            db.add(job)
            updated_jobs.append(job)

        await db.flush()
        return updated_jobs
