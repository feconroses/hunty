from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog


class ActivityService:
    """Service for logging user activity."""

    @staticmethod
    async def log(
        db: AsyncSession,
        user_id: int,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> ActivityLog:
        """Create an activity log record."""
        activity = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
        db.add(activity)
        await db.flush()
        return activity
