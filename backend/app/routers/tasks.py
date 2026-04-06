from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.task import (
    AddJobToTaskRequest,
    BulkMoveTasksRequest,
    CompleteTaskRequest,
    CreateTaskRequest,
    FailTaskRequest,
    ReorderTasksRequest,
    TaskResponse,
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tasks for the authenticated user."""
    return await TaskService.list_tasks(db, current_user.id)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: CreateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task."""
    return await TaskService.create_task(db, current_user.id, data)


@router.patch("/reorder", response_model=list[TaskResponse])
async def reorder_tasks(
    data: ReorderTasksRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reorder tasks by updating their queue_order."""
    return await TaskService.reorder_tasks(db, current_user.id, data)


@router.patch("/bulk-move", response_model=list[TaskResponse])
async def bulk_move_tasks(
    data: BulkMoveTasksRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move multiple tasks to a target queue."""
    return await TaskService.bulk_move_tasks(
        db, current_user.id, data.task_ids, data.target_queue
    )


@router.post("/auto-fill-today", response_model=list[TaskResponse])
async def auto_fill_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Auto-fill today's queue from the main queue."""
    return await TaskService.auto_fill_today(db, current_user.id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a task."""
    await TaskService.delete_task(db, current_user.id, task_id)


@router.post("/{task_id}/jobs", response_model=TaskResponse)
async def add_job_to_task(
    task_id: int,
    data: AddJobToTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a single job during a scan task (incremental save)."""
    return await TaskService.add_job_to_task(db, current_user.id, task_id, data)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    data: CompleteTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a task as completed with optional results."""
    return await TaskService.complete_task(db, current_user.id, task_id, data)


@router.post("/{task_id}/fail", response_model=TaskResponse)
async def fail_task(
    task_id: int,
    data: FailTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a task as failed."""
    return await TaskService.fail_task(db, current_user.id, task_id, data)
