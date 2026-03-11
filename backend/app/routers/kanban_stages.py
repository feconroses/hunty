from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.kanban import (
    CreateKanbanStageRequest,
    KanbanStageResponse,
    ReorderKanbanStagesRequest,
    UpdateKanbanStageRequest,
)
from app.services.kanban_service import KanbanService

router = APIRouter(prefix="/kanban-stages", tags=["kanban-stages"])


@router.get("", response_model=list[KanbanStageResponse])
async def list_stages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all kanban stages for the authenticated user."""
    return await KanbanService.list_stages(db, current_user.id)


@router.post("", response_model=KanbanStageResponse, status_code=status.HTTP_201_CREATED)
async def create_stage(
    data: CreateKanbanStageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new kanban stage."""
    return await KanbanService.create_stage(db, current_user.id, data)


@router.patch("/reorder", response_model=list[KanbanStageResponse])
async def reorder_stages(
    data: ReorderKanbanStagesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reorder kanban stages."""
    return await KanbanService.reorder_stages(db, current_user.id, data)


@router.patch("/{stage_id}", response_model=KanbanStageResponse)
async def update_stage(
    stage_id: int,
    data: UpdateKanbanStageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing kanban stage."""
    return await KanbanService.update_stage(db, current_user.id, stage_id, data)


@router.delete("/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stage(
    stage_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a kanban stage (only if no jobs are in it)."""
    await KanbanService.delete_stage(db, current_user.id, stage_id)
