# Slice 2: Recipe and child models

Type: AFK
Label to apply on publish: `ready-for-agent`

## Parent

PRD draft: `docs/prd/0001-initial-schema.md` (to be replaced with a GitHub Issue link once the PRD itself is published).

## What to build

Add the Recipe domain models on top of the User foundation established in Slice 1. A Recipe is owned by exactly one user and private to that owner. It carries a JSON list of instruction steps, structured per-recipe ingredient rows (with quantity, unit, item text, and ordering), and a sibling extraction-history table tracking where an AI-extracted recipe came from. All three models are registered in Django admin, with ingredient and source rows appearing as inlines on the Recipe admin so the dev can inspect/seed full recipes from one screen. Migration applied to Neon.

Tests are deferred for this slice per the PRD's Testing Decisions — no test work in scope here.

## Acceptance criteria

- [ ] `Recipe` model with the following fields:
  - `owner` ForeignKey to `api.User`, `on_delete=CASCADE`, `related_name="recipes"`.
  - `title` (required string).
  - `description` (blank-allowed text).
  - `servings` (nullable positive small integer).
  - `prep_time_minutes` and `cook_time_minutes` (nullable positive integers).
  - `hero_image_url` (blank-allowed URL).
  - `instructions` (`JSONField` defaulting to `[]`, holding a list of step strings).
  - `created_at` (auto-now-add) and `updated_at` (auto-now).
- [ ] `RecipeIngredient` model with:
  - `recipe` FK, `on_delete=CASCADE`, `related_name="ingredients"`.
  - `position` (positive small integer).
  - `qty` (nullable decimal — supports "salt to taste").
  - `unit` (blank-allowed string).
  - `item_text` (required string).
  - `note` (blank-allowed string).
  - `Meta.ordering = ["position"]`.
  - Unique constraint on `(recipe, position)`.
- [ ] `RecipeSource` model with:
  - `recipe` FK, `on_delete=CASCADE`, `related_name="sources"`.
  - `method` (TextChoices: `manual`, `url`, `image`).
  - `source_url` (blank-allowed URL).
  - `source_image_url` (blank-allowed URL).
  - `model_version` (blank-allowed string).
  - `extracted_at` (auto-now-add).
  - `is_current` (boolean, defaults to `True`). The "at most one current per recipe" invariant is enforced by application code, not the DB, in this slice.
- [ ] Cascade behaviour verified manually: deleting a `User` removes their `Recipe`s; deleting a `Recipe` removes its `RecipeIngredient`s and `RecipeSource`s.
- [ ] All three models registered in `api/admin.py`. `RecipeIngredient` and `RecipeSource` appear as `TabularInline` on the `Recipe` admin.
- [ ] Follow-up migration created with a descriptive `--name` (per `backend/CLAUDE.md`) and applied successfully to Neon.

## Blocked by

Slice 1 (User identity foundation) — `Recipe.owner` FKs to `api.User`, which doesn't exist until Slice 1 lands.
