from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.models.kanban import KanbanStage
from app.models.job import Job
from app.schemas.kanban import (
    CreateKanbanStageRequest,
    UpdateKanbanStageRequest,
    ReorderKanbanStagesRequest,
)

DEFAULT_STAGES = [
    {"name": "Discovered", "color": "#6366f1", "order": 0},
    {"name": "Interested", "color": "#f59e0b", "order": 1},
    {"name": "Applied", "color": "#3b82f6", "order": 2},
    {"name": "Interview", "color": "#8b5cf6", "order": 3},
    {"name": "Offer", "color": "#1db954", "order": 4},
    {"name": "Rejected", "color": "#ef4444", "order": 5},
    {"name": "Not Interested", "color": "#6b7280", "order": 6},
]


class KanbanService:
    """Service for managing kanban stages."""

    @staticmethod
    async def create_default_stages(
        db: AsyncSession, user_id: int
    ) -> list[KanbanStage]:
        """Create the 6 default kanban stages for a new user."""
        stages = []
        for stage_data in DEFAULT_STAGES:
            stage = KanbanStage(
                user_id=user_id,
                name=stage_data["name"],
                color=stage_data["color"],
                order=stage_data["order"],
                is_default=True,
            )
            db.add(stage)
            stages.append(stage)
        await db.flush()
        return stages

    @staticmethod
    async def list_stages(db: AsyncSession, user_id: int) -> list[KanbanStage]:
        """List all kanban stages for a user, ordered by their order field."""
        result = await db.execute(
            select(KanbanStage)
            .where(KanbanStage.user_id == user_id)
            .order_by(KanbanStage.order)
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_stage(
        db: AsyncSession, user_id: int, data: CreateKanbanStageRequest
    ) -> KanbanStage:
        """Create a new kanban stage."""
        if data.order is not None:
            order = data.order
        else:
            # Get the max order and add 1
            result = await db.execute(
                select(func.max(KanbanStage.order)).where(
                    KanbanStage.user_id == user_id
                )
            )
            max_order = result.scalar()
            order = (max_order + 1) if max_order is not None else 0

        stage = KanbanStage(
            user_id=user_id,
            name=data.name,
            color=data.color or "#6366f1",
            order=order,
            is_default=False,
        )
        db.add(stage)
        await db.flush()
        await db.refresh(stage)
        return stage

    @staticmethod
    async def update_stage(
        db: AsyncSession, user_id: int, stage_id: int, data: UpdateKanbanStageRequest
    ) -> KanbanStage:
        """Update an existing kanban stage."""
        result = await db.execute(
            select(KanbanStage).where(
                KanbanStage.id == stage_id, KanbanStage.user_id == user_id
            )
        )
        stage = result.scalar_one_or_none()
        if stage is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kanban stage not found.",
            )

        if data.name is not None:
            stage.name = data.name
        if data.color is not None:
            stage.color = data.color

        db.add(stage)
        await db.flush()
        await db.refresh(stage)
        return stage

    @staticmethod
    async def delete_stage(
        db: AsyncSession, user_id: int, stage_id: int
    ) -> None:
        """Delete a kanban stage. Prevents deletion if jobs exist in the stage."""
        result = await db.execute(
            select(KanbanStage).where(
                KanbanStage.id == stage_id, KanbanStage.user_id == user_id
            )
        )
        stage = result.scalar_one_or_none()
        if stage is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kanban stage not found.",
            )

        # Check if any jobs are in this stage
        job_count_result = await db.execute(
            select(func.count())
            .select_from(Job)
            .where(Job.kanban_stage_id == stage_id, Job.user_id == user_id)
        )
        job_count = job_count_result.scalar()
        if job_count and job_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete a kanban stage that contains jobs. Move or delete the jobs first.",
            )

        await db.delete(stage)
        await db.flush()

    @staticmethod
    async def reorder_stages(
        db: AsyncSession, user_id: int, data: ReorderKanbanStagesRequest
    ) -> list[KanbanStage]:
        """Reorder kanban stages by updating their order field."""
        for item in data.items:
            result = await db.execute(
                select(KanbanStage).where(
                    KanbanStage.id == item.id, KanbanStage.user_id == user_id
                )
            )
            stage = result.scalar_one_or_none()
            if stage is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Kanban stage with id {item.id} not found.",
                )
            stage.order = item.order
            db.add(stage)

        await db.flush()
        return await KanbanService.list_stages(db, user_id)
