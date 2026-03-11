import bcrypt


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt with 12 rounds."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode(), password_hash.encode())
