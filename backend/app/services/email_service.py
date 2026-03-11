import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def send_verification_email(email: str, token: str, frontend_url: str) -> None:
    """Send an email verification link to the user."""
    verification_url = f"{frontend_url}/verify-email?token={token}"

    if not settings.RESEND_API_KEY:
        logger.info(
            "DEV MODE - Verification email for %s: %s", email, verification_url
        )
        return

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": email,
                "subject": "Verify your Hunty account",
                "html": (
                    f"<h2>Welcome to Hunty!</h2>"
                    f"<p>Please verify your email address by clicking the link below:</p>"
                    f'<p><a href="{verification_url}">Verify Email</a></p>'
                    f"<p>This link expires in 24 hours.</p>"
                    f"<p>If you didn't create this account, you can ignore this email.</p>"
                ),
            }
        )
    except Exception as e:
        logger.error("Failed to send verification email to %s: %s", email, str(e))


async def send_password_reset_email(
    email: str, token: str, frontend_url: str
) -> None:
    """Send a password reset link to the user."""
    reset_url = f"{frontend_url}/reset-password?token={token}"

    if not settings.RESEND_API_KEY:
        logger.info(
            "DEV MODE - Password reset email for %s: %s", email, reset_url
        )
        return

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": email,
                "subject": "Reset your Hunty password",
                "html": (
                    f"<h2>Password Reset</h2>"
                    f"<p>You requested a password reset. Click the link below to set a new password:</p>"
                    f'<p><a href="{reset_url}">Reset Password</a></p>'
                    f"<p>This link expires in 1 hour.</p>"
                    f"<p>If you didn't request this, you can ignore this email.</p>"
                ),
            }
        )
    except Exception as e:
        logger.error("Failed to send password reset email to %s: %s", email, str(e))


async def send_welcome_email(email: str, first_name: str) -> None:
    """Send a welcome email after successful registration."""
    display_name = first_name or "there"

    if not settings.RESEND_API_KEY:
        logger.info("DEV MODE - Welcome email for %s (%s)", email, display_name)
        return

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": email,
                "subject": "Welcome to Hunty!",
                "html": (
                    f"<h2>Welcome to Hunty, {display_name}!</h2>"
                    f"<p>Your account has been created successfully.</p>"
                    f"<p>Start by adding companies you're interested in, and Hunty will help you "
                    f"track job opportunities.</p>"
                    f"<p>Happy job hunting!</p>"
                ),
            }
        )
    except Exception as e:
        logger.error("Failed to send welcome email to %s: %s", email, str(e))
