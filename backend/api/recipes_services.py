"""Service layer for recipe list / detail reads. No HTTP, no request objects."""

from __future__ import annotations

from .models import Recipe, User


def list_recipes(
    *, owner: User, page: int, per_page: int, sort: str
) -> tuple[list[Recipe], int]:
    # `-id` is appended as a server-side stability guarantee: when the primary
    # sort field ties (same `updated_at` second, identical `title`), the row
    # order would otherwise depend on the DB's row visit order — and Postgres
    # makes no promise there. Without this tiebreaker pagination could
    # duplicate or skip rows across pages.
    qs = Recipe.objects.filter(owner=owner).order_by(sort, "-id")
    total = qs.count()
    offset = (page - 1) * per_page
    return list(qs[offset : offset + per_page]), total
