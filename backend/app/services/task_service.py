import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.models.company import Company
from app.models.enums import (
    CompanySource,
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
from app.models.linkedin_search import LinkedInSearch
from app.models.task import Task
from app.schemas.task import (
    AddJobToTaskRequest,
    BulkMoveTasksRequest,
    CompleteTaskRequest,
    CreateTaskRequest,
    FailTaskRequest,
    ReorderTasksRequest,
)
from app.services.activity_service import ActivityService
from app.services.filter_service import _format_rules, FilterService

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

        # Batch-fetch LinkedIn searches
        search_ids = {t.linkedin_search_id for t in tasks if t.linkedin_search_id is not None}
        search_map: dict[int, LinkedInSearch] = {}
        if search_ids:
            search_result = await db.execute(
                select(LinkedInSearch).where(
                    LinkedInSearch.id.in_(search_ids), LinkedInSearch.user_id == user_id
                )
            )
            for s in search_result.scalars().all():
                search_map[s.id] = s

        # Batch-fetch filter rules (general + company-specific) for scan_careers_page tasks
        scan_company_ids = {
            t.company_id for t in tasks
            if t.task_type == TaskType.scan_careers_page and t.company_id is not None
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

        # Batch-fetch filter rules for scan_linkedin tasks
        scan_search_ids = {
            t.linkedin_search_id for t in tasks
            if t.task_type == TaskType.scan_linkedin and t.linkedin_search_id is not None
        }
        rules_by_search: dict[int | None, list[FilterRule]] = {}
        if scan_search_ids:
            rules_result = await db.execute(
                select(FilterRule).where(
                    FilterRule.user_id == user_id,
                    (FilterRule.linkedin_search_id.in_(scan_search_ids) | (
                        FilterRule.company_id.is_(None) & FilterRule.linkedin_search_id.is_(None)
                    )),
                )
            )
            for rule in rules_result.scalars().all():
                key = rule.linkedin_search_id  # None for global rules
                rules_by_search.setdefault(key, []).append(rule)

        # Fetch section order once for all tasks
        section_order = await FilterService.get_section_order(db, user_id)

        enriched = []
        for task in tasks:
            company = company_map.get(task.company_id) if task.company_id else None
            search = search_map.get(task.linkedin_search_id) if task.linkedin_search_id else None

            # Build filter criteria text for scan_careers_page tasks
            filter_criteria = None
            if task.task_type == TaskType.scan_careers_page and task.company_id is not None:
                general_rules = rules_by_company.get(None, [])
                company_rules = rules_by_company.get(task.company_id, [])
                all_rules = general_rules + company_rules
                if all_rules:
                    filter_criteria = _format_rules(all_rules, section_order)
            elif task.task_type == TaskType.scan_linkedin and task.linkedin_search_id is not None:
                general_rules = rules_by_search.get(None, [])
                search_rules = rules_by_search.get(task.linkedin_search_id, [])
                all_rules = general_rules + search_rules
                if all_rules:
                    filter_criteria = _format_rules(all_rules, section_order)

            enriched.append({
                "id": task.id,
                "user_id": task.user_id,
                "company_id": task.company_id,
                "linkedin_search_id": task.linkedin_search_id,
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
                "linkedin_search_name": search.keywords if search else None,
                "linkedin_search_url": search.linkedin_url if search else None,
                "linkedin_search_location": search.location if search else None,
            })
        return enriched

    @staticmethod
    async def _enrich_task(db: AsyncSession, task: Task, user_id: int) -> dict:
        """Enrich a single task with company data, LinkedIn search data, and filter criteria."""
        company = None
        if task.company_id is not None:
            result = await db.execute(
                select(Company).where(
                    Company.id == task.company_id, Company.user_id == user_id
                )
            )
            company = result.scalar_one_or_none()

        search = None
        if task.linkedin_search_id is not None:
            result = await db.execute(
                select(LinkedInSearch).where(
                    LinkedInSearch.id == task.linkedin_search_id,
                    LinkedInSearch.user_id == user_id,
                )
            )
            search = result.scalar_one_or_none()

        filter_criteria = None
        section_order = await FilterService.get_section_order(db, user_id)
        if task.task_type == TaskType.scan_careers_page and task.company_id is not None:
            rules_result = await db.execute(
                select(FilterRule).where(
                    FilterRule.user_id == user_id,
                    (FilterRule.company_id == task.company_id) | FilterRule.company_id.is_(None),
                )
            )
            rules = list(rules_result.scalars().all())
            if rules:
                filter_criteria = _format_rules(rules, section_order)
        elif task.task_type == TaskType.scan_linkedin and task.linkedin_search_id is not None:
            rules_result = await db.execute(
                select(FilterRule).where(
                    FilterRule.user_id == user_id,
                    (FilterRule.linkedin_search_id == task.linkedin_search_id) | (
                        FilterRule.company_id.is_(None) & FilterRule.linkedin_search_id.is_(None)
                    ),
                )
            )
            rules = list(rules_result.scalars().all())
            if rules:
                filter_criteria = _format_rules(rules, section_order)

        return {
            "id": task.id,
            "user_id": task.user_id,
            "company_id": task.company_id,
            "linkedin_search_id": task.linkedin_search_id,
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
            "linkedin_search_name": search.keywords if search else None,
            "linkedin_search_url": search.linkedin_url if search else None,
            "linkedin_search_location": search.location if search else None,
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

        # If linkedin_search_id provided, validate ownership
        if data.linkedin_search_id is not None:
            result = await db.execute(
                select(LinkedInSearch).where(
                    LinkedInSearch.id == data.linkedin_search_id,
                    LinkedInSearch.user_id == user_id,
                )
            )
            if result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="LinkedIn search not found.",
                )

        task = Task(
            user_id=user_id,
            company_id=data.company_id,
            linkedin_search_id=data.linkedin_search_id,
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
    async def _get_discovered_stage(db: AsyncSession, user_id: int) -> KanbanStage:
        """Find or create the 'Discovered' kanban stage for a user."""
        stage_result = await db.execute(
            select(KanbanStage).where(
                KanbanStage.user_id == user_id, KanbanStage.name == "Discovered"
            )
        )
        stage = stage_result.scalar_one_or_none()
        if stage is None:
            fallback_result = await db.execute(
                select(KanbanStage)
                .where(KanbanStage.user_id == user_id)
                .order_by(KanbanStage.order)
                .limit(1)
            )
            stage = fallback_result.scalar_one_or_none()
        if stage is None:
            from app.services.kanban_service import KanbanService
            stages = await KanbanService.create_default_stages(db, user_id)
            stage = stages[0]
            logger.info("Auto-created default kanban stages for user %d", user_id)
        return stage

    @staticmethod
    async def _find_or_create_discovered_company(
        db: AsyncSession, user_id: int, company_name: str
    ) -> Company:
        """Find an existing discovered company by name, or create a new one."""
        company_name = (company_name or "Unknown Company").strip()
        comp_result = await db.execute(
            select(Company).where(
                Company.user_id == user_id,
                Company.name == company_name,
                Company.source == CompanySource.discovered,
            )
        )
        company = comp_result.scalar_one_or_none()
        if company is None:
            company = Company(
                user_id=user_id,
                name=company_name,
                url=None,
                source=CompanySource.discovered,
                status=CompanyStatus.active,
            )
            db.add(company)
            await db.flush()
            await db.refresh(company)
        return company

    @staticmethod
    async def add_job_to_task(
        db: AsyncSession, user_id: int, task_id: int, data: AddJobToTaskRequest
    ) -> dict:
        """Save a single job during a scan task (incremental save)."""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Task not found."
            )
        if task.status != TaskStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only add jobs to pending tasks.",
            )
        if task.task_type not in (TaskType.scan_careers_page, TaskType.scan_linkedin):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This task type does not support adding jobs.",
            )

        # Get discovered kanban stage
        discovered_stage = await TaskService._get_discovered_stage(db, user_id)

        # Resolve company
        company_id = task.company_id
        company_name = None
        if task.task_type == TaskType.scan_linkedin:
            company = await TaskService._find_or_create_discovered_company(
                db, user_id, data.company_name or "Unknown Company"
            )
            company_id = company.id
            company_name = company.name
        else:
            if task.company_id:
                comp_result = await db.execute(
                    select(Company.name).where(Company.id == task.company_id)
                )
                company_name = comp_result.scalar_one_or_none()

        # URL dedup
        if data.url:
            existing = await db.execute(
                select(Job.id).where(
                    Job.user_id == user_id, Job.url == data.url
                ).limit(1)
            )
            if existing.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="duplicate_url",
                )

        # Determine kanban_order
        saved_jobs = (task.result_data or {}).get("saved_jobs", [])
        kanban_order = float(len(saved_jobs))

        # Create Job
        job = Job(
            user_id=user_id,
            company_id=company_id,
            linkedin_search_id=task.linkedin_search_id,
            title=data.title,
            url=data.url,
            location=data.location,
            work_type=_safe_enum(WorkType, data.work_type),
            seniority_level=_safe_enum(SeniorityLevel, data.seniority_level),
            department=data.department,
            skills=data.skills or [],
            language_requirements=data.language_requirements,
            description_summary=data.description_summary,
            kanban_stage_id=discovered_stage.id,
            kanban_order=kanban_order,
        )
        db.add(job)
        await db.flush()
        await db.refresh(job)

        # Update task.result_data with saved job summary
        # IMPORTANT: Build a completely new list to avoid shared references
        # with SQLAlchemy's cached value (shallow copy shares the inner list,
        # causing SQLAlchemy to miss the change on subsequent saves)
        old_data = task.result_data or {}
        saved_jobs = list(old_data.get("saved_jobs", []))
        saved_jobs.append({
            "job_id": job.id,
            "title": job.title,
            "company_name": company_name,
            "company_id": company_id,
            "url": job.url,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        })
        task.result_data = {"saved_jobs": saved_jobs}
        db.add(task)
        await db.flush()

        # Update company stats incrementally
        if company_id:
            comp_result = await db.execute(
                select(Company).where(
                    Company.id == company_id, Company.user_id == user_id
                )
            )
            comp = comp_result.scalar_one_or_none()
            if comp:
                comp.jobs_found_count = comp.jobs_found_count + 1
                comp.last_scanned_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.add(comp)

        await db.flush()
        await db.refresh(task)
        return await TaskService._enrich_task(db, task, user_id)

    @staticmethod
    async def complete_task(
        db: AsyncSession, user_id: int, task_id: int, data: CompleteTaskRequest
    ) -> Task:
        """
        Mark a task as completed and run chain logic:
        - find_careers_page: update company careers_page_url, create scan_careers_page child task
        - scan_careers_page: create Job records from result_data.jobs, assign to 'Discovered' stage
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
        elif task.task_type == TaskType.scan_careers_page:
            await TaskService._handle_scan_careers_page_complete(db, user_id, task, data)
        elif task.task_type == TaskType.scan_linkedin:
            await TaskService._handle_scan_linkedin_complete(db, user_id, task, data)

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
        2. Create a scan_careers_page child task
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

            # Create scan_careers_page child task
            child_task = Task(
                user_id=user_id,
                company_id=task.company_id,
                task_type=TaskType.scan_careers_page,
                status=TaskStatus.pending,
                queue=task.queue,
                queue_order=0,
                parent_task_id=task.id,
            )
            db.add(child_task)
            await db.flush()

    @staticmethod
    async def _handle_scan_careers_page_complete(
        db: AsyncSession, user_id: int, task: Task, data: CompleteTaskRequest
    ) -> None:
        """
        After scan_careers_page completes:
        - If jobs were saved incrementally (saved_jobs in result_data): just update company stats
        - Backward compat: if result_data has 'jobs' key, create them the old way
        """
        # Backward compat: batch job creation from old flow
        new_job_count = 0
        if data.result_data and "jobs" in data.result_data:
            discovered_stage = await TaskService._get_discovered_stage(db, user_id)

            existing_url_result = await db.execute(
                select(Job.url).where(
                    Job.user_id == user_id,
                    Job.company_id == task.company_id,
                    Job.url.isnot(None),
                )
            )
            existing_urls = {row.url for row in existing_url_result.all()}

            for idx, job_data in enumerate(data.result_data["jobs"]):
                url = job_data.get("url")
                if url and url in existing_urls:
                    continue
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
                    language_requirements=job_data.get("language_requirements"),
                    description_summary=job_data.get("description_summary"),
                    full_description=job_data.get("full_description"),
                    kanban_stage_id=discovered_stage.id,
                    kanban_order=float(idx),
                )
                db.add(job)
                new_job_count += 1

        # Count incrementally saved jobs
        saved_jobs = (task.result_data or {}).get("saved_jobs", [])
        total_new = new_job_count + len(saved_jobs)

        # Update company stats
        if task.company_id is not None and total_new > 0:
            company_result = await db.execute(
                select(Company).where(
                    Company.id == task.company_id, Company.user_id == user_id
                )
            )
            company = company_result.scalar_one_or_none()
            if company is not None:
                company.last_scanned_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.add(company)

        await db.flush()

    @staticmethod
    async def _handle_scan_linkedin_complete(
        db: AsyncSession, user_id: int, task: Task, data: CompleteTaskRequest
    ) -> None:
        """
        After scan_linkedin completes:
        - If jobs were saved incrementally (saved_jobs in result_data): just update stats
        - Backward compat: if result_data has 'jobs' key, create them the old way
        """
        company_cache: dict[str, Company] = {}
        new_job_count = 0

        # Backward compat: batch job creation from old flow
        if data.result_data and "jobs" in data.result_data:
            discovered_stage = await TaskService._get_discovered_stage(db, user_id)

            existing_url_result = await db.execute(
                select(Job.url).where(
                    Job.user_id == user_id, Job.url.isnot(None),
                )
            )
            existing_urls = {row.url for row in existing_url_result.all()}

            for idx, job_data in enumerate(data.result_data["jobs"]):
                url = job_data.get("url")
                if url and url in existing_urls:
                    continue

                company_name = (job_data.get("company_name") or "Unknown Company").strip()
                if company_name not in company_cache:
                    company_cache[company_name] = (
                        await TaskService._find_or_create_discovered_company(
                            db, user_id, company_name
                        )
                    )
                company_id = company_cache[company_name].id

                job = Job(
                    user_id=user_id,
                    company_id=company_id,
                    linkedin_search_id=task.linkedin_search_id,
                    title=job_data.get("title", "Untitled"),
                    url=url,
                    location=job_data.get("location"),
                    work_type=_safe_enum(WorkType, job_data.get("work_type")),
                    salary_min=job_data.get("salary_min"),
                    salary_max=job_data.get("salary_max"),
                    salary_currency=job_data.get("salary_currency", "USD"),
                    seniority_level=_safe_enum(SeniorityLevel, job_data.get("seniority_level")),
                    department=job_data.get("department"),
                    skills=job_data.get("skills", []),
                    language_requirements=job_data.get("language_requirements"),
                    description_summary=job_data.get("description_summary"),
                    full_description=job_data.get("full_description"),
                    kanban_stage_id=discovered_stage.id,
                    kanban_order=float(idx),
                )
                db.add(job)
                new_job_count += 1
                if url:
                    existing_urls.add(url)

        # Count incrementally saved jobs
        saved_jobs = (task.result_data or {}).get("saved_jobs", [])
        total_new = new_job_count + len(saved_jobs)

        # Update LinkedIn search stats
        if task.linkedin_search_id is not None and total_new > 0:
            search_result = await db.execute(
                select(LinkedInSearch).where(
                    LinkedInSearch.id == task.linkedin_search_id,
                    LinkedInSearch.user_id == user_id,
                )
            )
            search = search_result.scalar_one_or_none()
            if search is not None:
                search.jobs_found_count = search.jobs_found_count + total_new
                search.last_scanned_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.add(search)

        # Update discovered company stats (for both old and new flow)
        # Collect company IDs from saved_jobs
        company_ids_from_saved = {
            sj["company_id"] for sj in saved_jobs if sj.get("company_id")
        }
        for comp_id in company_ids_from_saved:
            if comp_id not in {c.id for c in company_cache.values()}:
                comp_result = await db.execute(
                    select(Company).where(Company.id == comp_id, Company.user_id == user_id)
                )
                comp = comp_result.scalar_one_or_none()
                if comp:
                    comp.last_scanned_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    db.add(comp)

        for company in company_cache.values():
            count_result = await db.execute(
                select(func.count()).select_from(Job).where(
                    Job.company_id == company.id, Job.user_id == user_id
                )
            )
            company.jobs_found_count = count_result.scalar() or 0
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
