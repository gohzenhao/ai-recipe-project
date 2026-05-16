"""Plain-function service layer for auth. No HTTP, no request objects."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction

from .models import User


class EmailAlreadyInUseError(Exception):
    """Raised by register_user when canonicalized email already exists."""


def _canonicalize_email(email: str) -> str:
    return email.strip().lower()


def authenticate_credentials(email: str, password: str) -> User | None:
    """Look up a user by canonicalized email and verify the password.

    Returns the User on success; returns None on either bad password OR no
    such user — callers must not distinguish the two (no enumeration leak).
    """
    UserModel = get_user_model()
    canonical = _canonicalize_email(email)
    try:
        user = UserModel.objects.get(email=canonical)
    except UserModel.DoesNotExist:
        return None
    if not user.check_password(password):
        return None
    if not user.is_active:
        return None
    return user


def register_user(email: str, password: str, display_name: str) -> User:
    """Create a new active user. Validates password and rejects duplicates."""
    UserModel = get_user_model()
    canonical = _canonicalize_email(email)
    # Run password validators against a candidate user so
    # UserAttributeSimilarityValidator can compare against email/display_name.
    candidate = UserModel(email=canonical, display_name=display_name)
    validate_password(password, user=candidate)
    try:
        with transaction.atomic():
            return UserModel.objects.create_user(
                email=canonical,
                password=password,
                display_name=display_name,
            )
    except IntegrityError as exc:
        raise EmailAlreadyInUseError(canonical) from exc
