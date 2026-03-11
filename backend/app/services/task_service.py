import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.models.company import Company
from app.models.enums import (
    CompanyStatus,
    SeniorityLevel,
    TaskQueue,
    TaskStatus,
    TaskType,
    WorkType,
)
from app.models.filter_rule import FilterRule
from app.models.job import Job
from app.models.kanban import KanbanStage
from app.models.task import Task
from app.schemas.task import (
    BulkMoveTasksRequest,
    CompleteTaskRequest,
    CreateTaskRequest,
    FailTaskRequest,
    ReorderTasksRequest,
)
from app.services.activity_service import ActivityService
from app.services.filter_service import _format_rule

logger = logging.getLogger(__name__)

# Maximum number of tasks to move to "today" queue via auto-fill
AUTO_FILL_LIMIT = 5


def _safe_enum(enum_cls, value):
    """Convert a value to an enum member, returning None if invalid."""
    if value is None:
        return None
    try:
        return enum_cls(value)
    except ValueError:
        return None


class TaskService:
    """Service for managing tasks."""

    @staticmethod
    async def list_tasks(db: AsyncSession, user_id: int) -> list[dict]:
        """List all tasks for a user, enriched with company data and filter criteria."""
        result = await db.execute(
            select(Task)
            .where(Task.user_id == user_id)
            .order_by(Task.queue_order, Task.created_at.desc())
        )
        tasks = list(result.scalars().all())

        # Batch-fetch companies
        company_ids = {t.company_id for t in tasks if t.company_id is not None}
        company_map: dict[int, Company] = {}
        if company_ids:
            comp_result = await db.execute(
                select(Company).where(
                    Company.id.in_(company_ids), Company.user_id == user_id
                )
            )
            for c in comp_result.scalars().all():
                company_map[c.id] = c

        # Batch-fetch filter rules (general + company-specific) for scan_jobs tasks
        scan_company_ids = {
            t.company_id for t in tasks
            if t.task_type == TaskType.scan_jobs and t.company_id is not None
        }
        rules_by_company: dict[int | None, list[FilterRule]] = {}
        if scan_company_ids:
            rules_result = await db.execute(
                select(FilterRule).where(
                    FilterRule.user_id == user_id,
                    (FilterRule.company_id.in_(scan_company_ids) | FilterRule.company_id.is_(None)),
                )
            )
            for rule in rules_result.scalars().all():
                rules_by_company.setdefault(rule.company_id, []).append(rule)

        enriched = []
        for task in tasks:
            company = company_map.get(task.company_id) if task.company_id else None

            # Build filter criteria text for scan_jobs tasks
            filter_criteria = None
            if task.task_type == TaskType.scan_jobs and task.company_id is not None:
                general_rules = rules_by_company.get(None, [])
                company_rules = rules_by_company.get(task.company_id, [])
                all_rules = general_rules + company_rules
                if all_rules:
                    filter_criteria = "\n".join(_format_rule(r) for r in all_rules)

            enriched.append({
                "id": task.id,
                "user_id": task.user_id,
                "company_id": task.company_id,
                "task_type": task.task_type.value if isinstance(task.task_type, TaskType) else task.task_type,
                "status": task.status.value if isinstance(task.status, TaskStatus) else task.status,
                "queue": task.queue.value if isinstance(task.queue, TaskQueue) else task.queue,
                "queue_order": task.queue_order,
                "parent_task_id": task.parent_task_id,
                "notes": task.notes,
                "result_data": task.result_data,
                "scheduled_for": task.scheduled_for,
                "completed_at": task.completed_at,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "company_name": company.name if company else None,
                "company_url": company.url if company else None,
                "careers_page_url": company.careers_page_url if company else None,
                "filter_criteria": filter_criteria,
            })
        return enriched

    @staticmethod
    async def _enrich_task(db: AsyncSession, task: Task, user_id: int) -> dict:
        """Enrich a single task with company data and filter criteria."""
        company = None
        if task.company_id is not None:
            result = await db.execute(
                select(Company).where(
                    Company.id == task.company_id, Company.user_id == user_id
                )
            )
            company = result.scalar_one_or_none()

        filter_criteria = None
        if task.task_type == TaskType.scan_jobs and task.company_id is not None:
            rules_result = await db.execute(
                select(FilterRule).where(
                    FilterRule.user_id == user_id,
                    (FilterRule.company_id == task.company_id) | FilterRule.company_id.is_(None),
                )
            )
            rules = list(rules_result.scalars().all())
            if rules:
                filter_criteria = "\n".join(_format_rule(r) for r in rules)

        return {
            "id": task.id,
            "user_id": task.user_id,
            "company_id": task.company_id,
            "task_type": task.task_type.value if isinstance(task.task_type, TaskType) else task.task_type,
            "status": task.status.value if isinstance(task.status, TaskStatus) else task.status,
            "queue": task.queue.value if isinstance(task.queue, TaskQueue) else task.queue,
            "queue_order": task.queue_order,
            "parent_task_id": task.parent_task_id,
            "notes": task.notes,
            "result_data": task.result_data,
            "scheduled_for": task.scheduled_for,
            "completed_at": task.completed_at,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "company_name": company.name if company else None,
            "company_url": company.url if company else None,
            "careers_page_url": company.careers_page_url if company else None,
            "filter_criteria": filter_criteria,
        }

    @staticmethod
    async def create_task(
        db: AsyncSession, user_id: int, data: CreateTaskRequest
    ) -> Task:
        """Create a new task."""
        task_type = TaskType(data.task_type)

        # If company_id provided, validate ownership
        if data.company_id is not None:
            result = await db.execute(
                select(Company).where(
                    Company.id == data.company_id, Company.user_id == user_id
                )
            )
            if result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Company not found.",
                )

        task = Task(
            user_id=user_id,
            company_id=data.company_id,
            task_type=task_type,
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
            details={"task_type": task.task_type.value},
        )

        return await TaskService._enrich_task(db, task, user_id)

    @staticmethod
    async def complete_task(
        db: AsyncSession, user_id: int, task_id: int, data: CompleteTaskRequest
    ) -> Task:
        """
        Mark a task as completed and run chain logic:
        - find_careers_page: update company careers_page_url, create scan_jobs child task
        - scan_jobs: create Job records from result_data.jobs, assign to 'Discovered' stage
        """
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )

        if task.status != TaskStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending tasks can be completed.",
            )

        task.status = TaskStatus.completed
        task.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if data.notes is not None:
            task.notes = data.notes
        if data.result_data is not None:
            task.result_data = data.result_data
        db.add(task)
        await db.flush()

        # Chain logic based on task type
        if task.task_type == TaskType.find_careers_page:
            await TaskService._handle_find_careers_page_complete(db, user_id, task, data)
        elif task.task_type == TaskType.scan_jobs:
            await TaskService._handle_scan_jobs_complete(db, user_id, task, data)

        await db.refresh(task)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="task_completed",
            entity_type="task",
            entity_id=task.id,
            details={"task_type": task.task_type.value},
        )

        return await TaskService._enrich_task(db, task, user_id)

    @staticmethod
    async def _handle_find_careers_page_complete(
        db: AsyncSession, user_id: int, task: Task, data: CompleteTaskRequest
    ) -> None:
        """
        After find_careers_page completes:
        1. Update the company's careers_page_url from result_data
        2. Create a scan_jobs child task
        """
        if task.company_id is not None:
            company_result = await db.execute(
                select(Company).where(
                    Company.id == task.company_id, Company.user_id == user_id
                )
            )
            company = company_result.scalar_one_or_none()
            if company is not None and data.result_data:
                careers_url = data.result_data.get("careers_url")
                if careers_url:
                    company.careers_page_url = careers_url
                    company.status = CompanyStatus.active
                    db.add(company)

            # Create scan_jobs child task
            child_task = Task(
                user_id=user_id,
                company_id=task.company_id,
                task_type=TaskType.scan_jobs,
                status=TaskStatus.pending,
                queue=task.queue,
                queue_order=0,
                parent_task_id=task.id,
            )
            db.add(child_task)
            await db.flush()

    @staticmethod
    async def _handle_scan_jobs_complete(
        db: AsyncSession, user_id: int, task: Task, data: CompleteTaskRequest
    ) -> None:
        """
        After scan_jobs completes:
        1. Create Job records from result_data.jobs
        2. Put them in the 'Discovered' kanban stage
        3. Update company jobs_found_count and last_scanned_at
        """
        if not data.result_data or "jobs" not in data.result_data:
            return

        # Find the "Discovered" kanban stage for this user, auto-create if missing
        stage_result = await db.execute(
            select(KanbanStage).where(
                KanbanStage.user_id == user_id, KanbanStage.name == "Discovered"
            )
        )
        discovered_stage = stage_result.scalar_one_or_none()
        if discovered_stage is None:
            # Fall back to first stage by order
            fallback_result = await db.execute(
                select(KanbanStage)
                .where(KanbanStage.user_id == user_id)
                .order_by(KanbanStage.order)
                .limit(1)
            )
            discovered_stage = fallback_result.scalar_one_or_none()
        if discovered_stage is None:
            # No stages at all — create defaults
            from app.services.kanban_service import KanbanService
            stages = await KanbanService.create_default_stages(db, user_id)
            discovered_stage = stages[0]
            logger.info("Auto-created default kanban stages for user %d", user_id)
        discovered_stage_id = discovered_stage.id

        # Fetch existing job URLs for this company to skip duplicates
        existing_url_result = await db.execute(
            select(Job.url).where(
                Job.user_id == user_id,
                Job.company_id == task.company_id,
                Job.url.isnot(None),
            )
        )
        existing_urls = {row.url for row in existing_url_result.all()}

        jobs_data = data.result_data["jobs"]
        new_job_count = 0

        for idx, job_data in enumerate(jobs_data):
            url = job_data.get("url")
            if url and url in existing_urls:
                continue  # skip duplicate

            job = Job(
                user_id=user_id,
                company_id=task.company_id,
                title=job_data.get("title", "Untitled"),
                url=job_data.get("url"),
                location=job_data.get("location"),
                work_type=_safe_enum(WorkType, job_data.get("work_type")),
                salary_min=job_data.get("salary_min"),
                salary_max=job_data.get("salary_max"),
                salary_currency=job_data.get("salary_currency", "USD"),
                seniority_level=_safe_enum(SeniorityLevel, job_data.get("seniority_level")),
                department=job_data.get("department"),
                skills=job_data.get("skills", []),
                description_summary=job_data.get("description_summary"),
                full_description=job_data.get("full_description"),
                kanban_stage_id=discovered_stage_id,
                kanban_order=float(idx),
            )
            db.add(job)
            new_job_count += 1

        # Update company stats
        if task.company_id is not None:
            company_result = await db.execute(
                select(Company).where(
                    Company.id == task.company_id, Company.user_id == user_id
                )
            )
            company = company_result.scalar_one_or_none()
            if company is not None:
                company.jobs_found_count = company.jobs_found_count + new_job_count
                company.last_scanned_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.add(company)

        await db.flush()

    @staticmethod
    async def fail_task(
        db: AsyncSession, user_id: int, task_id: int, data: FailTaskRequest
    ) -> Task:
        """Mark a task as failed."""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )

        if task.status != TaskStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending tasks can be marked as failed.",
            )

        task.status = TaskStatus.failed
        task.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if data.notes is not None:
            task.notes = data.notes
        db.add(task)
        await db.flush()
        await db.refresh(task)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="task_failed",
            entity_type="task",
            entity_id=task.id,
            details={"task_type": task.task_type.value},
        )

        return await TaskService._enrich_task(db, task, user_id)

    @staticmethod
    async def delete_task(
        db: AsyncSession, user_id: int, task_id: int
    ) -> None:
        """Delete a task."""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )
        await db.delete(task)
        await db.flush()

    @staticmethod
    async def reorder_tasks(
        db: AsyncSession, user_id: int, data: ReorderTasksRequest
    ) -> list[dict]:
        """Reorder tasks by updating their queue_order field."""
        for item in data.items:
            result = await db.execute(
                select(Task).where(Task.id == item.id, Task.user_id == user_id)
            )
            task = result.scalar_one_or_none()
            if task is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task with id {item.id} not found.",
                )
            task.queue_order = item.queue_order
            db.add(task)

        await db.flush()
        return await TaskService.list_tasks(db, user_id)

    @staticmethod
    async def bulk_move_tasks(
        db: AsyncSession, user_id: int, task_ids: list[int], target_queue: str
    ) -> list[dict]:
        """Move multiple tasks to a target queue."""
        queue = TaskQueue(target_queue)

        for task_id in task_ids:
            result = await db.execute(
                select(Task).where(Task.id == task_id, Task.user_id == user_id)
            )
            task = result.scalar_one_or_none()
            if task is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task with id {task_id} not found.",
                )
            task.queue = queue
            db.add(task)

        await db.flush()
        return await TaskService.list_tasks(db, user_id)

    @staticmethod
    async def auto_fill_today(db: AsyncSession, user_id: int) -> list[dict]:
        """
        Move the top N tasks from 'queue' to 'today' queue.
        """
        result = await db.execute(
            select(Task)
            .where(
                Task.user_id == user_id,
                Task.queue == TaskQueue.queue,
                Task.status == TaskStatus.pending,
            )
            .order_by(Task.queue_order, Task.created_at)
            .limit(AUTO_FILL_LIMIT)
        )
        tasks_to_move = result.scalars().all()

        for task in tasks_to_move:
            task.queue = TaskQueue.today
            db.add(task)

        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="auto_fill_today",
            entity_type="task",
            details={"count": len(tasks_to_move)},
        )

        return await TaskService.list_tasks(db, user_id)
