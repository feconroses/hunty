import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.jwt import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    verify_token,
)
from app.auth.passwords import hash_password, verify_password
from app.auth.validators import sanitize_input, validate_email, validate_password
from app.config import settings
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.services.email_service import (
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)
from app.services.kanban_service import KanbanService

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication and user management."""

    @staticmethod
    async def register(db: AsyncSession, data: RegisterRequest) -> dict:
        """
        Register a new user.

        Creates the user, sets up default kanban stages, sends a verification
        email, and returns the user with tokens.
        """
        email = sanitize_input(data.email).lower()
        if not validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email address.",
            )

        is_valid, error_msg = validate_password(data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )

        # Check if user already exists
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        # Create user
        user = User(
            email=email,
            password_hash=hash_password(data.password),
            first_name=sanitize_input(data.first_name) if data.first_name else None,
            last_name=sanitize_input(data.last_name) if data.last_name else None,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        # Create default kanban stages
        await KanbanService.create_default_stages(db, user.id)

        # Send verification email
        verification_token = create_email_verification_token(user.id, user.email)
        await send_verification_email(
            user.email, verification_token, settings.FRONTEND_URL
        )

        # Send welcome email
        await send_welcome_email(user.email, user.first_name)

        # Generate tokens
        access_token = create_access_token(user.id, user.email)
        refresh_token = create_refresh_token(user.id, user.email)
        csrf_token = str(uuid4())

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "csrf_token": csrf_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email_verified": user.email_verified,
                "is_active": user.is_active,
            },
        }

    @staticmethod
    async def login(db: AsyncSession, data: LoginRequest) -> dict:
        """
        Authenticate a user with email and password.

        Returns the user with tokens on success.
        """
        email = sanitize_input(data.email).lower()

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is None or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated.",
            )

        access_token = create_access_token(user.id, user.email)
        refresh_token = create_refresh_token(user.id, user.email)
        csrf_token = str(uuid4())

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "csrf_token": csrf_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email_verified": user.email_verified,
                "is_active": user.is_active,
            },
        }

    @staticmethod
    async def refresh_token(db: AsyncSession, refresh_token_str: str) -> dict:
        """
        Verify a refresh token and return new tokens.
        """
        payload = verify_token(refresh_token_str, expected_type="refresh")
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )

        user_id = payload.get("user_id")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive.",
            )

        access_token = create_access_token(user.id, user.email)
        new_refresh_token = create_refresh_token(user.id, user.email)
        csrf_token = str(uuid4())

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "csrf_token": csrf_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email_verified": user.email_verified,
                "is_active": user.is_active,
            },
        }

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> None:
        """
        Initiate a password reset flow.

        Always returns success to prevent email enumeration.
        """
        email = sanitize_input(email).lower()

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is not None:
            reset_token = create_password_reset_token(user.id, user.email)
            await send_password_reset_email(
                user.email, reset_token, settings.FRONTEND_URL
            )

    @staticmethod
    async def reset_password(
        db: AsyncSession, token: str, new_password: str
    ) -> None:
        """
        Reset a user's password using a reset token.
        """
        payload = verify_token(token, expected_type="password_reset")
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token.",
            )

        is_valid, error_msg = validate_password(new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )

        user_id = payload.get("user_id")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        user.password_hash = hash_password(new_password)
        user.password_changed_at = datetime.now(timezone.utc)
        db.add(user)
        await db.flush()

    @staticmethod
    async def verify_email(db: AsyncSession, token: str) -> None:
        """
        Verify a user's email using the verification token.
        """
        payload = verify_token(token, expected_type="email_verification")
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token.",
            )

        user_id = payload.get("user_id")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        user.email_verified = True
        db.add(user)
        await db.flush()
