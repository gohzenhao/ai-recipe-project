from django.urls import path
from ninja import NinjaAPI

from .auth import router as auth_router
from .recipes import router as recipes_router

# Ninja exempts its own views from Django's CsrfViewMiddleware; CSRF is
# enforced inside auth classes (SessionAuth / _CsrfAuth) instead.
api = NinjaAPI()


@api.get("/health")
def health(request):
    return {"status": "ok"}


api.add_router("/auth/", auth_router)
api.add_router("/recipes/", recipes_router)


urlpatterns = [path("", api.urls)]
