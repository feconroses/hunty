from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt

from app.config import settings


def _create_token(
    user_id: int,
    email: str,
    token_type: str,
    expires_delta: timedelta,
) -> str:
    """Create a signed JWT with standard claims."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "email": email,
        "type": token_type,
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int, email: str) -> str:
    """Create a short-lived access token."""
    return _create_token(
        user_id=user_id,
        email=email,
        token_type="access",
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: int, email: str) -> str:
    """Create a long-lived refresh token."""
    return _create_token(
        user_id=user_id,
        email=email,
        token_type="refresh",
        expires_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_email_verification_token(user_id: int, email: str) -> str:
    """Create a token for email verification (24 hours)."""
    return _create_token(
        user_id=user_id,
        email=email,
        token_type="email_verification",
        expires_delta=timedelta(hours=24),
    )


def create_password_reset_token(user_id: int, email: str) -> str:
    """Create a token for password reset (1 hour)."""
    return _create_token(
        user_id=user_id,
        email=email,
        token_type="password_reset",
        expires_delta=timedelta(hours=1),
    )


def verify_token(token: str, expected_type: str) -> dict | None:
    """
    Decode and verify a JWT token.

    Returns the decoded payload dict if valid, or None if the token is
    invalid, expired, or does not match the expected type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != expected_type:
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
