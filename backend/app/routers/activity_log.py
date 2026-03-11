from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.dependencies import get_current_user, get_db
from app.models.activity_log import ActivityLog
from app.models.user import User

router = APIRouter(prefix="/activity-log", tags=["activity-log"])


@router.get("")
async def list_activity_log(
    entity_type: Optional[str] = Query(default=None),
    entity_id: Optional[int] = Query(default=None),
    action: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List activity log entries with optional filters and pagination."""
    query = select(ActivityLog).where(ActivityLog.user_id == current_user.id)

    if entity_type is not None:
        query = query.where(ActivityLog.entity_type == entity_type)
    if entity_id is not None:
        query = query.where(ActivityLog.entity_id == entity_id)
    if action is not None:
        query = query.where(ActivityLog.action == action)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Apply ordering and pagination
    query = query.order_by(ActivityLog.created_at.desc())
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "action": item.action,
                "entity_type": item.entity_type,
                "entity_id": item.entity_id,
                "details": item.details,
                "created_at": item.created_at,
            }
            for item in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
