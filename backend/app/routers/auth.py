import logging

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_MAX_AGE = 30 * 24 * 3600  # 30 days in seconds


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Set the refresh_token as an httpOnly cookie on the response."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh_token cookie."""
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account."""
    result = await AuthService.register(db, data)
    _set_refresh_cookie(response, result["refresh_token"])
    return AuthResponse(
        access_token=result["access_token"],
        user=result["user"],
        csrf_token=result["csrf_token"],
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Log in with email and password."""
    result = await AuthService.login(db, data)
    _set_refresh_cookie(response, result["refresh_token"])
    return AuthResponse(
        access_token=result["access_token"],
        user=result["user"],
        csrf_token=result["csrf_token"],
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using the refresh_token cookie."""
    if refresh_token is None:
        logger.warning("[auth] Refresh called with NO cookie — returning 401")
        # Don't clear the cookie here — if the cookie wasn't sent due to a
        # transient issue (proxy timing, HMR, etc.), clearing it would make
        # the problem permanent. The cookie may still be valid in the browser.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided.",
        )
    logger.info("[auth] Refresh called with cookie (len=%d)", len(refresh_token))
    try:
        result = await AuthService.refresh_token(db, refresh_token)
    except HTTPException as exc:
        logger.warning("[auth] Refresh token invalid: %s — clearing cookie", exc.detail)
        # Clear stale cookie so the browser doesn't keep sending it
        _clear_refresh_cookie(response)
        raise
    logger.info("[auth] Refresh succeeded for user_id=%s", result.get("user", {}).get("id"))
    _set_refresh_cookie(response, result["refresh_token"])
    return AuthResponse(
        access_token=result["access_token"],
        user=result["user"],
        csrf_token=result["csrf_token"],
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    """Log out by clearing the refresh token cookie."""
    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully."}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset email."""
    await AuthService.forgot_password(db, data.email)
    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a reset token."""
    await AuthService.reset_password(db, data.token, data.password)
    return {"message": "Password has been reset successfully."}


@router.get("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Verify email address using the verification token."""
    await AuthService.verify_email(db, token)
    return {"message": "Email verified successfully."}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's info."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email_verified": current_user.email_verified,
        "is_active": current_user.is_active,
    }
