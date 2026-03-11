from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.filter_rule import (
    CreateFilterRequest,
    FilterRuleResponse,
    UpdateFilterRequest,
)
from app.services.filter_service import FilterService

router = APIRouter(prefix="/filters", tags=["filters"])


@router.get("", response_model=list[FilterRuleResponse])
async def list_filters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all filter rules for the authenticated user."""
    return await FilterService.list_filters(db, current_user.id)


@router.post("", response_model=FilterRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_filter(
    data: CreateFilterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new filter rule."""
    return await FilterService.create_filter(db, current_user.id, data)


@router.get("/prompt/{company_id}")
async def generate_prompt(
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate the Claude prompt for filtering jobs at a company."""
    prompt = await FilterService.generate_prompt(db, current_user.id, company_id)
    return {"prompt": prompt}


@router.patch("/{filter_id}", response_model=FilterRuleResponse)
async def update_filter(
    filter_id: int,
    data: UpdateFilterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing filter rule."""
    return await FilterService.update_filter(db, current_user.id, filter_id, data)


@router.delete("/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_filter(
    filter_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a filter rule."""
    await FilterService.delete_filter(db, current_user.id, filter_id)
