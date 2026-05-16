"""Ninja router for /api/auth/."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import login as django_login
from django.http import HttpRequest
from django.views.decorators.csrf import ensure_csrf_cookie
from ninja import Router
from ninja.decorators import decorate_view
from ninja.security.apikey import APIKeyCookie

from .auth_schemas import LoginIn, UserOut
from .auth_services import authenticate_credentials
from .models import User

router = Router()


class SessionAuth(APIKeyCookie):
    """Auth class for endpoints that require a logged-in user.

    Subclasses `APIKeyCookie` so the CSRF check fires on mutating methods
    (the cookie-auth class is the only place Ninja enforces CSRF, since
    `CsrfViewMiddleware` is bypassed by Ninja's `csrf_exempt` view wrapper).
    Exported for reuse by future protected endpoints.
    """

    param_name: str = settings.SESSION_COOKIE_NAME

    def authenticate(self, request: HttpRequest, key: str | None) -> User | None:
        user = request.user
        if user.is_authenticated:
            return user  # type: ignore[return-value]
        return None


class _CsrfAuth(APIKeyCookie):
    """Permissive auth that performs CSRF check on mutating methods but
    allows anonymous callers. Used on /login (and /signup in Slice 2) so the
    SPA's `X-CSRFToken` header is verified for endpoints reachable while
    logged out.
    """

    param_name: str = "csrftoken"

    def authenticate(self, request: HttpRequest, key: str | None) -> bool:
        return True


def _user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url or "",
    }


@router.post("/login", auth=_CsrfAuth(), response={200: UserOut, 401: dict})
def login(request: HttpRequest, payload: LoginIn):
    user = authenticate_credentials(payload.email, payload.password)
    if user is None:
        return 401, {"detail": "Invalid email or password"}
    django_login(request, user)
    return 200, _user_out(user)


# `/me` doubles as the CSRF-cookie seeder for the SPA's cold-load probe —
# `@ensure_csrf_cookie` is what avoids a separate `/csrf` endpoint. The
# decorator wraps the whole view, so the cookie is set on both the authed
# and unauthenticated branches.
@router.get("/me", auth=None, response={200: UserOut, 401: dict})
@decorate_view(ensure_csrf_cookie)
def me(request: HttpRequest):
    user = request.user
    if not user.is_authenticated:
        return 401, {"detail": "Not authenticated"}
    return 200, _user_out(user)  # type: ignore[arg-type]
