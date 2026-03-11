import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.passwords import hash_password, verify_password
from app.auth.validators import sanitize_input, validate_email, validate_password
from app.models.activity_log import ActivityLog
from app.models.company import Company
from app.models.filter_rule import FilterRule
from app.models.job import Job
from app.models.kanban import KanbanStage
from app.models.task import Task
from app.models.user import PasswordResetToken, User
from app.schemas.auth import ChangePasswordRequest, UpdateProfileRequest

logger = logging.getLogger(__name__)


class UserService:
    """Service for managing user profile and account."""

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: int) -> dict:
        """Get the user's profile information."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email_verified": user.email_verified,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }

    @staticmethod
    async def update_profile(
        db: AsyncSession, user_id: int, data: UpdateProfileRequest
    ) -> dict:
        """Update the user's profile."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        if data.first_name is not None:
            user.first_name = sanitize_input(data.first_name)
        if data.last_name is not None:
            user.last_name = sanitize_input(data.last_name)
        if data.email is not None:
            new_email = sanitize_input(data.email).lower()
            if not validate_email(new_email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid email address.",
                )
            # Check if email is already taken by another user
            existing_result = await db.execute(
                select(User).where(User.email == new_email, User.id != user_id)
            )
            if existing_result.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email is already in use.",
                )
            user.email = new_email
            user.email_verified = False  # Require re-verification

        db.add(user)
        await db.flush()
        await db.refresh(user)

        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email_verified": user.email_verified,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }

    @staticmethod
    async def change_password(
        db: AsyncSession, user_id: int, data: ChangePasswordRequest
    ) -> None:
        """Change the user's password after verifying the current one."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )

        is_valid, error_msg = validate_password(data.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )

        user.password_hash = hash_password(data.new_password)
        user.password_changed_at = datetime.now(timezone.utc)
        db.add(user)
        await db.flush()

    @staticmethod
    async def delete_account(db: AsyncSession, user_id: int) -> None:
        """
        Delete a user account and all associated data.

        Cascades through: activity_logs, filter_rules, jobs, tasks, companies,
        kanban_stages, and the user record itself.
        """
        # Delete activity logs
        activity_result = await db.execute(
            select(ActivityLog).where(ActivityLog.user_id == user_id)
        )
        for log in activity_result.scalars().all():
            await db.delete(log)

        # Delete filter rules
        filter_result = await db.execute(
            select(FilterRule).where(FilterRule.user_id == user_id)
        )
        for rule in filter_result.scalars().all():
            await db.delete(rule)

        # Delete password reset tokens
        token_result = await db.execute(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
        )
        for token in token_result.scalars().all():
            await db.delete(token)

        # Delete jobs
        job_result = await db.execute(
            select(Job).where(Job.user_id == user_id)
        )
        for job in job_result.scalars().all():
            await db.delete(job)

        # Delete tasks
        task_result = await db.execute(
            select(Task).where(Task.user_id == user_id)
        )
        for task in task_result.scalars().all():
            await db.delete(task)

        # Delete companies
        company_result = await db.execute(
            select(Company).where(Company.user_id == user_id)
        )
        for company in company_result.scalars().all():
            await db.delete(company)

        # Delete kanban stages
        kanban_result = await db.execute(
            select(KanbanStage).where(KanbanStage.user_id == user_id)
        )
        for stage in kanban_result.scalars().all():
            await db.delete(stage)

        # Delete the user
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user is not None:
            await db.delete(user)

        await db.flush()
