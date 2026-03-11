import re


_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)

_PASSWORD_SPECIAL_CHARS = re.compile(r"[!@#$%^&*()_+\-=\[\]{}|;:'\",.<>?/\\`~]")


def validate_email(email: str) -> bool:
    """Validate that the string looks like a valid email address."""
    if not email or len(email) > 255:
        return False
    return _EMAIL_RE.match(email) is not None


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength.

    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    Returns a tuple of (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."
    if not _PASSWORD_SPECIAL_CHARS.search(password):
        return False, "Password must contain at least one special character."
    return True, ""


def sanitize_input(text: str) -> str:
    """Strip leading and trailing whitespace from the input."""
    if not isinstance(text, str):
        return text
    return text.strip()
