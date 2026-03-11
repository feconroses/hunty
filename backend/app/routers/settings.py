from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, UpdateProfileRequest
from app.schemas.settings import UpdateSettingsRequest
from app.services.user_service import UserService

router = APIRouter(tags=["settings"])


@router.get("/settings")
async def get_settings(
    current_user: User = Depends(get_current_user),
):
    """Get user settings (placeholder)."""
    return {
        "user_id": current_user.id,
        "settings": {},
    }


@router.patch("/settings")
async def update_settings(
    data: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user settings (placeholder)."""
    return {
        "user_id": current_user.id,
        "settings": {},
        "message": "Settings updated successfully.",
    }


@router.patch("/profile")
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the user's profile."""
    return await UserService.update_profile(db, current_user.id, data)


@router.post("/profile/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the user's password."""
    await UserService.change_password(db, current_user.id, data)
    return {"message": "Password changed successfully."}


@router.delete("/profile", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the user's account and all associated data."""
    await UserService.delete_account(db, current_user.id)
