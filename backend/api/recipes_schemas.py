"""Ninja schemas for the recipes list endpoint."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from ninja import Field, Schema

# Closed enum of `sort` values. The leading-`-` form is descending; the bare
# form is ascending. Keeping these as literal strings means the value passed to
# the service can be fed straight into Django's `order_by`.
RecipesSort = Literal["title", "-title", "updated_at", "-updated_at"]


class RecipeListItem(Schema):
    id: int
    title: str
    updated_at: datetime


class RecipeListPage(Schema):
    items: list[RecipeListItem]
    total: int
    page: int
    per_page: int


class ListRecipesQuery(Schema):
    sort: RecipesSort = "-updated_at"
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
