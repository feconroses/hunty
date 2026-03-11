import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.models.company import Company
from app.models.enums import CompanyStatus, TaskQueue, TaskStatus, TaskType
from app.models.filter_rule import FilterRule
from app.models.job import Job
from app.models.task import Task
from app.schemas.company import CreateCompanyRequest, UpdateCompanyRequest
from app.services.activity_service import ActivityService

logger = logging.getLogger(__name__)


class CompanyService:
    """Service for managing companies."""

    @staticmethod
    async def list_companies(
        db: AsyncSession, user_id: int
    ) -> list[dict]:
        """List all companies for a user, including pending task count."""
        result = await db.execute(
            select(Company)
            .where(Company.user_id == user_id)
            .order_by(Company.created_at.desc())
        )
        companies = result.scalars().all()

        company_list = []
        for company in companies:
            # Count pending tasks for this company
            task_count_result = await db.execute(
                select(func.count())
                .select_from(Task)
                .where(
                    Task.company_id == company.id,
                    Task.user_id == user_id,
                    Task.status == TaskStatus.pending,
                )
            )
            pending_count = task_count_result.scalar() or 0

            company_dict = {
                "id": company.id,
                "user_id": company.user_id,
                "name": company.name,
                "url": company.url,
                "careers_page_url": company.careers_page_url,
                "status": company.status.value if isinstance(company.status, CompanyStatus) else company.status,
                "last_scanned_at": company.last_scanned_at,
                "jobs_found_count": company.jobs_found_count,
                "created_at": company.created_at,
                "updated_at": company.updated_at,
                "pending_tasks_count": pending_count,
            }
            company_list.append(company_dict)

        return company_list

    @staticmethod
    async def create_company(
        db: AsyncSession, user_id: int, data: CreateCompanyRequest
    ) -> Company:
        """
        Create a new company and auto-create a find_careers_page task.
        """
        company = Company(
            user_id=user_id,
            name=data.name.strip(),
            url=data.url.strip(),
            status=CompanyStatus.pending,
        )
        db.add(company)
        await db.flush()
        await db.refresh(company)

        # Auto-create find_careers_page task
        task = Task(
            user_id=user_id,
            company_id=company.id,
            task_type=TaskType.find_careers_page,
            status=TaskStatus.pending,
            queue=TaskQueue.queue,
            queue_order=0,
        )
        db.add(task)
        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="company_created",
            entity_type="company",
            entity_id=company.id,
            details={"name": company.name, "url": company.url},
        )

        return company

    @staticmethod
    async def update_company(
        db: AsyncSession, user_id: int, company_id: int, data: UpdateCompanyRequest
    ) -> Company:
        """Update an existing company."""
        result = await db.execute(
            select(Company).where(
                Company.id == company_id, Company.user_id == user_id
            )
        )
        company = result.scalar_one_or_none()
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found.",
            )

        if data.name is not None:
            company.name = data.name.strip()
        if data.url is not None:
            company.url = data.url.strip()
        if data.careers_page_url is not None:
            company.careers_page_url = data.careers_page_url.strip()
        if data.status is not None:
            company.status = CompanyStatus(data.status)

        db.add(company)
        await db.flush()
        await db.refresh(company)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="company_updated",
            entity_type="company",
            entity_id=company.id,
        )

        return company

    @staticmethod
    async def delete_company(
        db: AsyncSession, user_id: int, company_id: int
    ) -> None:
        """Delete a company and all related tasks and jobs."""
        result = await db.execute(
            select(Company).where(
                Company.id == company_id, Company.user_id == user_id
            )
        )
        company = result.scalar_one_or_none()
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found.",
            )

        # Delete related filter rules
        filter_result = await db.execute(
            select(FilterRule).where(
                FilterRule.company_id == company_id, FilterRule.user_id == user_id
            )
        )
        for rule in filter_result.scalars().all():
            await db.delete(rule)

        # Delete related jobs
        jobs_result = await db.execute(
            select(Job).where(Job.company_id == company_id, Job.user_id == user_id)
        )
        for job in jobs_result.scalars().all():
            await db.delete(job)

        # Delete related tasks
        tasks_result = await db.execute(
            select(Task).where(
                Task.company_id == company_id, Task.user_id == user_id
            )
        )
        for task in tasks_result.scalars().all():
            await db.delete(task)

        company_name = company.name
        await db.delete(company)
        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="company_deleted",
            entity_type="company",
            entity_id=company_id,
            details={"name": company_name},
        )
