from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.linkedin_search import (
    CreateLinkedInSearchRequest,
    LinkedInSearchResponse,
    UpdateLinkedInSearchRequest,
)
from app.schemas.task import TaskResponse
from app.services.linkedin_search_service import LinkedInSearchService

router = APIRouter(prefix="/linkedin-searches", tags=["linkedin-searches"])


@router.get("", response_model=list[LinkedInSearchResponse])
async def list_searches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all LinkedIn searches for the authenticated user."""
    return await LinkedInSearchService.list_searches(db, current_user.id)


@router.post("", response_model=LinkedInSearchResponse, status_code=status.HTTP_201_CREATED)
async def create_search(
    data: CreateLinkedInSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new LinkedIn search."""
    return await LinkedInSearchService.create_search(db, current_user.id, data)


@router.patch("/{search_id}", response_model=LinkedInSearchResponse)
async def update_search(
    search_id: int,
    data: UpdateLinkedInSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing LinkedIn search."""
    return await LinkedInSearchService.update_search(db, current_user.id, search_id, data)


@router.delete("/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search(
    search_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a LinkedIn search and all related data."""
    await LinkedInSearchService.delete_search(db, current_user.id, search_id)


@router.post("/{search_id}/scan", response_model=TaskResponse)
async def trigger_scan(
    search_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a new scan task for a LinkedIn search."""
    return await LinkedInSearchService.trigger_scan(db, current_user.id, search_id)
