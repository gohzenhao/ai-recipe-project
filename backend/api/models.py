from __future__ import annotations

from typing import Any

from django.conf import settings
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


class Recipe(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipes",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    servings = models.PositiveSmallIntegerField(null=True, blank=True)
    prep_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    cook_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    hero_image_url = models.URLField(blank=True)
    instructions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="ingredients",
    )
    position = models.PositiveSmallIntegerField()
    qty = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=32, blank=True)
    item_text = models.CharField(max_length=200)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "position"],
                name="unique_recipe_ingredient_position",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.position}. {self.item_text}"


class RecipeSource(models.Model):
    class Method(models.TextChoices):
        MANUAL = "manual", "Manual"
        URL = "url", "URL"
        IMAGE = "image", "Image"

    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="sources",
    )
    method = models.CharField(max_length=16, choices=Method.choices)
    source_url = models.URLField(blank=True)
    source_image_url = models.URLField(blank=True)
    model_version = models.CharField(max_length=64, blank=True)
    extracted_at = models.DateTimeField(auto_now_add=True)
    is_current = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.recipe_id}:{self.method}@{self.extracted_at:%Y-%m-%d}"
