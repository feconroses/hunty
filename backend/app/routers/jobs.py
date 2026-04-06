from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from sqlmodel import select

from app.models.job import Job
from app.schemas.job import (
    CheckJobUrlRequest,
    CreateJobRequest,
    JobResponse,
    ReorderJobsRequest,
    UpdateJobRequest,
)
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("")
async def list_jobs(
    kanban_stage_id: Optional[int] = Query(default=None),
    company_id: Optional[int] = Query(default=None),
    work_type: Optional[str] = Query(default=None),
    seniority_level: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List jobs with optional filters and pagination."""
    return await JobService.list_jobs(
        db,
        current_user.id,
        kanban_stage_id=kanban_stage_id,
        company_id=company_id,
        work_type=work_type,
        seniority_level=seniority_level,
        location=location,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post("/check-url")
async def check_job_url(
    data: CheckJobUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if a job URL already exists for a given company."""
    conditions = [Job.user_id == current_user.id, Job.url == data.url]
    if data.company_id is not None:
        conditions.append(Job.company_id == data.company_id)
    result = await db.execute(
        select(Job.id).where(*conditions).limit(1)
    )
    return {"exists": result.scalar_one_or_none() is not None}


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    data: CreateJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new job."""
    return await JobService.create_job(db, current_user.id, data)


@router.patch("/reorder")
async def reorder_jobs(
    data: ReorderJobsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reorder jobs across kanban stages (drag and drop)."""
    jobs = await JobService.reorder_jobs(db, current_user.id, data)
    return {"items": jobs}


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    data: UpdateJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing job."""
    return await JobService.update_job(db, current_user.id, job_id, data)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a job."""
    await JobService.delete_job(db, current_user.id, job_id)
