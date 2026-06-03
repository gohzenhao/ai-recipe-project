"""Ninja router for /api/recipes/."""

from __future__ import annotations

from django.http import HttpRequest
from ninja import Query, Router

from .auth import SessionAuth
from .recipes_schemas import ListRecipesQuery, RecipeListPage
from .recipes_services import list_recipes

router = Router()


@router.get("/", auth=SessionAuth(), response={200: RecipeListPage})
def list_recipes_endpoint(request: HttpRequest, query: Query[ListRecipesQuery]):
    items, total = list_recipes(
        owner=request.user,
        page=query.page,
        per_page=query.per_page,
        sort=query.sort,
    )
    return 200, {
        "items": [
            {"id": r.id, "title": r.title, "updated_at": r.updated_at}
            for r in items
        ],
        "total": total,
        "page": query.page,
        "per_page": query.per_page,
    }
