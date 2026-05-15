from __future__ import annotations

from typing import Any

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager["User"]):
    """Manager for the email-as-identifier User model.

    Required because dropping the inherited `username` field breaks
    `AbstractUser`'s default manager.
    """

    use_in_migrations = True

    def _create_user(
        self, email: str, password: str | None, **extra_fields: Any
    ) -> User:
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> User:
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> User:
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        extra_fields.setdefault("display_name", email)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None  # type: ignore[assignment]
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=150)
    avatar_url = models.URLField(blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["display_name"]

    objects = UserManager()

    def __str__(self) -> str:
        return self.email
