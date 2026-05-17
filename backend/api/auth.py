"""Ninja router for /api/auth/."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.core.exceptions import ValidationError
from django.http import HttpRequest, HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from ninja import Router
from ninja.decorators import decorate_view
from ninja.security.apikey import APIKeyCookie

from .auth_schemas import LoginIn, SignupIn, UserOut
from .auth_services import (
    EmailAlreadyInUseError,
    authenticate_credentials,
    register_user,
)
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


@router.post("/signup", auth=_CsrfAuth(), response={200: UserOut, 400: dict})
def signup(request: HttpRequest, payload: SignupIn):
    try:
        user = register_user(payload.email, payload.password, payload.display_name)
    except EmailAlreadyInUseError:
        return 400, {
            "detail": [
                {
                    "loc": ["body", "payload", "email"],
                    "msg": "Email already in use",
                    "type": "value_error.email_taken",
                }
            ]
        }
    except ValidationError as exc:
        # Django's password validators raise ValidationError with one or more
        # sub-errors; surface each as a field-level entry on `password`.
        return 400, {
            "detail": [
                {
                    "loc": ["body", "payload", "password"],
                    "msg": message,
                    "type": f"value_error.{code or 'password_invalid'}",
                }
                for message, code in _iter_validator_errors(exc)
            ]
        }
    django_login(request, user)
    return 200, _user_out(user)


def _iter_validator_errors(exc: ValidationError):
    """Yield (message, code) pairs from a Django ValidationError."""
    for err in exc.error_list:
        yield err.message % (err.params or ()), err.code


# `SessionAuth` enforces both "is logged in" and CSRF on POST, so a stolen
# `sessionid` cookie without the matching CSRF token cannot log the user out
# of their other tabs.
@router.post("/logout", auth=SessionAuth())
def logout(request: HttpRequest):
    django_logout(request)
    return HttpResponse(status=204)


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
