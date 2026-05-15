from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Recipe, RecipeIngredient, RecipeSource, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "display_name", "is_staff", "is_superuser")
    search_fields = ("email", "display_name")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("display_name", "first_name", "last_name", "avatar_url")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "display_name", "password1", "password2"),
            },
        ),
    )


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 0
    fields = ("position", "qty", "unit", "item_text", "note")
    ordering = ("position",)


class RecipeSourceInline(admin.TabularInline):
    model = RecipeSource
    extra = 0
    fields = (
        "method",
        "source_url",
        "source_image_url",
        "model_version",
        "is_current",
        "extracted_at",
    )
    readonly_fields = ("extracted_at",)


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "servings", "created_at", "updated_at")
    list_filter = ("created_at",)
    search_fields = ("title", "owner__email")
    autocomplete_fields = ("owner",)
    inlines = (RecipeIngredientInline, RecipeSourceInline)


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ("recipe", "position", "qty", "unit", "item_text")
    list_filter = ("unit",)
    search_fields = ("item_text", "recipe__title")
    autocomplete_fields = ("recipe",)


@admin.register(RecipeSource)
class RecipeSourceAdmin(admin.ModelAdmin):
    list_display = ("recipe", "method", "is_current", "extracted_at")
    list_filter = ("method", "is_current")
    search_fields = ("recipe__title", "source_url")
    autocomplete_fields = ("recipe",)
    readonly_fields = ("extracted_at",)
