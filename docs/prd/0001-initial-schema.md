# PRD 0001: Initial database schema — User, auth, and Recipes

Status: draft (pending publication to GitHub Issues with label `ready-for-agent`)

## Problem Statement

I just started this monorepo and the Django backend has no models — `api/models.py` is empty. Until there is a schema, no feature (signup, login, viewing recipes, manual recipe creation, or any of the four AI features) can be built or persisted. Several of the foundational decisions are hard to reverse — most notably, the choice of user model has to be in place before the first `migrate` runs against the Neon database. I need a stable schema foundation so subsequent feature work has somewhere to land.

## Solution

Land a first set of Django models covering three concerns:

1. **User identity** — a custom user model (`AbstractUser` subclass) where email is the unique login identifier, with a separate display name for UI bylines and a URL field for an avatar. Backed by a custom `UserManager`.
2. **Recipe** — title, description, servings, prep/cook times, hero image URL, a JSON list of instruction strings, and timestamps. Owned by exactly one user, private to that owner.
3. **Recipe child models** — a per-recipe structured ingredient table (`RecipeIngredient` with `position`, `qty`, `unit`, `item_text`, `note`) and a 1:N extraction-history sibling (`RecipeSource`) capturing where AI-extracted recipes came from.

Plus the supporting wiring: settings change for `AUTH_USER_MODEL`, the initial migration, Django admin registration for development inspection, the project glossary in `CONTEXT.md`, and one ADR capturing the rejection of Neon Auth in favour of Django's own auth.

## User Stories

End-user stories that this schema unblocks:

1. As a user, I want to sign up with my email address, so I don't need to invent a username.
2. As a user, I want to set a display name when I sign up, so my recipes have an author byline that isn't my email.
3. As a user, I want my display name to be allowed to collide with other users', so I'm not forced into "alice47".
4. As a user, I want to optionally set an avatar URL, so my profile feels personal.
5. As a user, I want all my recipes to be private by default, so my personal notes stay personal.
6. As a user, I want each recipe to record its title, description, servings count, prep time, and cook time, so I capture the full context of a dish.
7. As a user, I want to attach a hero image URL to my recipe, so it's visually distinguishable in a list view.
8. As a user, I want ingredients to be stored as structured rows (quantity, unit, item, optional note), so the app can scale and substitute them precisely later.
9. As a user, I want my ingredients to keep their original order, so the recipe reads correctly top-to-bottom.
10. As a user, I want to record ingredients with no quantity (e.g. "salt to taste"), so I'm not forced into fake numbers.
11. As a user, I want instructions stored as an ordered list of step strings, so a step-by-step UI can render them natively.
12. As a user, I want each recipe to know where it came from — manual entry, a URL, or an uploaded image — so I can re-find the original source.
13. As a user, I want the app to keep history of multiple AI extraction attempts against the same recipe, so I can re-extract when models improve without losing prior versions.
14. As a user, I want exactly one extraction to be marked "current" at any time, so the UI shows a single source of truth.
15. As a user, I want all my recipes deleted when I delete my account, so I don't leave orphan data behind.
16. As a user, I want deleting a recipe to also remove its ingredients and source history, so there's no dangling data.

Developer / system stories:

17. As a developer, I want the custom user model defined and `AUTH_USER_MODEL` set before the first migration, so I'm not stuck migrating away from Django's default user later.
18. As a developer, I want a custom `UserManager` that creates users by email, so `create_user` and `create_superuser` work without a `username` argument.
19. As a developer, I want `RecipeIngredient` to enforce unique `(recipe, position)` at the DB level, so duplicate-position bugs surface as integrity errors rather than silent ordering corruption.
20. As a developer, I want primary keys to remain Django's default `BigAutoField`, so I'm not paying for UUID complexity without a use case.
21. As a developer, I want the initial migration named `initial_user_and_recipes` (per the backend `--name` convention), so future readers can scan the migration log meaningfully.
22. As a developer, I want all four models registered in Django admin (with ingredient and source inlines on the Recipe admin), so I can inspect and seed data via `/admin/` during development.
23. As a developer, I want `CONTEXT.md` to capture the resolved domain terms (User, Recipe, RecipeIngredient, RecipeSource, Owner, Source), so future contributors agree on language.
24. As a developer, I want an ADR documenting why we chose Django's auth over Neon Auth (which is already provisioned in the same Neon project), so a future reader doesn't try to "fix" this by switching to Neon Auth.

## Implementation Decisions

**Auth and user identity**

- Use Django's built-in auth, with a custom user model subclassing `AbstractUser`. Neon Auth is provisioned in the same Neon project but is deliberately not used; rationale captured in ADR 0001.
- Email is the unique login identifier. `username = None`; `USERNAME_FIELD = "email"`; `REQUIRED_FIELDS = ["display_name"]` so `createsuperuser` prompts for it.
- `display_name` is required, not unique. Collisions between users are fine.
- `avatar_url` is a URL field, blank-allowed. Image storage is external (S3/Cloudinary via a pre-signed-URL upload flow); the schema only ever holds the resulting URL.
- A custom `UserManager` is required because dropping `username` breaks Django's default manager. The manager owns the `create_user(email, password=None, **extra_fields)` and `create_superuser(email, password=None, **extra_fields)` contract.
- `AUTH_USER_MODEL = "api.User"` must be set in settings before any `migrate` runs against the Neon database.
- AbstractUser-inherited fields kept as-is: `first_name`, `last_name`, `is_active`, `is_staff`, `is_superuser`, `date_joined`, `last_login`. `is_staff` / `is_superuser` are needed for `/admin/`.

**Recipe and child models**

- Recipe is owned by exactly one user via a `ForeignKey`. Visibility is implicitly private — only the owner sees their recipes. There is no `visibility` column. Public / unlisted / shared states are deferred until there is a real feature requirement.
- Cascade behaviour: deleting a User deletes their Recipes; deleting a Recipe deletes its RecipeIngredients and RecipeSources. No soft-delete in v1.
- Recipe core fields: `title` (required), `description`, `servings`, `prep_time_minutes`, `cook_time_minutes`, `hero_image_url`, `instructions`, `created_at`, `updated_at`.
- Instructions are stored as a `JSONField` defaulting to `[]`, holding a list of step strings. Promotion to a separate `RecipeStep` table is deferred until per-step metadata (timers, images) is required.
- Ingredients are modelled as per-recipe rows in a `RecipeIngredient` table — not a global Ingredient master table, not a JSON list, not a freeform blob. Each row carries `position`, `qty`, `unit`, `item_text`, `note`. This shape unblocks structured scaling (pure math on `qty`) and substitution (string match on `item_text`) without taking on master-data complexity.
- `qty` is a `DecimalField` (nullable, so "salt to taste" works). `unit` is a free-form `CharField`; promotion to a controlled-vocabulary enum is deferred until unit-conversion features arrive.
- `RecipeIngredient` enforces unique `(recipe, position)` to prevent duplicate slots.

**AI extraction provenance**

- Modelled as a sibling `RecipeSource` table with 1:N cardinality (a Recipe can have many extraction attempts over time).
- Fields: `method` (choices: `manual`, `url`, `image`), `source_url`, `source_image_url`, `model_version`, `extracted_at`, `is_current` (boolean).
- The "at most one current source per recipe" invariant is enforced by application code in v1. A DB-level partial unique index is a candidate for a follow-up PRD.

**Cross-cutting**

- Primary keys are Django's default `BigAutoField`. Not UUIDs.
- No tags or categories in v1; easy to add later via `ArrayField` or M2M.
- Initial migration must be named `initial_user_and_recipes` (per the `--name` convention in `backend/CLAUDE.md`).
- Glossary terms to be added to `CONTEXT.md` (created lazily): **User**, **Recipe**, **RecipeIngredient**, **RecipeSource**, **Owner**, **Source**.
- One ADR to be written: `docs/adr/0001-django-auth-with-custom-user-model.md`. Criteria met: hard to reverse (custom user model is migration-painful after the fact); surprising without context (Neon Auth is sitting in the same DB and the obvious "why didn't they use it?" question needs an answer); real trade-off (Neon Auth was a genuine alternative).

## Testing Decisions

Good tests for this PRD verify external behaviour — the public manager contract and DB-enforced integrity — not implementation details. We do not test internal field types, generated SQL, or the contents of Django's own auth code.

Tests in scope (per developer selection):

- **`UserManager.create_user`** — creates a user with a hashed password (not plaintext); `email` is populated; `is_staff` is `False`; `is_superuser` is `False`. Rejects a blank email with `ValueError`.
- **`UserManager.create_superuser`** — creates a user with `is_staff=True`, `is_superuser=True`, hashed password.
- **User email uniqueness** — inserting two users with the same email raises `IntegrityError` from the database.

Tests explicitly deferred (developer chose to skip):

- Recipe → RecipeIngredient / RecipeSource and User → Recipe cascade behaviours. These ride on Django's own `on_delete` semantics; revisit when (and if) a custom delete handler is introduced.
- The `RecipeIngredient` unique `(recipe, position)` constraint. Enforced at the DB layer; tests can be added later without schema change.
- `Recipe.instructions` default of `[]`. Trivial Django default.

Prior art: there is no prior art — `api/tests.py` is the empty Django scaffold. This PRD establishes the convention of Django `TestCase`-based tests living in `api/tests.py`, run via `python manage.py test`.

## Out of Scope

- API endpoints for signup, login, logout, profile, recipe CRUD, ingredient CRUD, source CRUD. The auth wiring (session middleware, login views, password reset email flow, email verification) is in scope only insofar as `AUTH_USER_MODEL` is set; endpoints are follow-up PRDs.
- Frontend forms or UI for any of the above.
- AI features themselves: URL extraction, image extraction, smart substitutions, smart scaling. The schema is shaped to support them; each implementation is a separate PRD.
- Image upload pipeline — pre-signed URL endpoints, storage backend choice (S3 vs Cloudinary), CORS, signed-URL TTLs. The schema stores URLs only.
- Public / unlisted / shared visibility for recipes.
- Tags or categories.
- Soft-delete or recipe-deletion recovery.
- Social features — forking, ratings, favourites, comments, follows.
- Migration of any data from Neon Auth's `neon_auth.*` schema. We are not using Neon Auth in this app.
- Controlled-vocabulary ingredient units (cup vs ml, etc.) and unit conversion. `unit` stays a free-form string in v1.
- DB-level partial unique index enforcing "one current source per recipe."

## Further Notes

- The Neon project (`tiny-glade-98132334`, "Test database") is shared with another project. If this app starts holding real user data, consider splitting into a dedicated Neon project — the user has flagged awareness of this trade-off.
- `python-dotenv` is loaded with `override=True` in `config/settings.py` to defeat a stray `DATABASE_URL` exported in the user's shell. Anything that re-reads env (e.g. a test runner that bypasses `settings.py`) must be cross-checked against this.
- The custom user model must be in place **before** the first `python manage.py migrate` runs against any environment. If a migration has already been run against the Neon DB with Django's default user model, the first implementation step is to reset that state (e.g. drop the relevant tables or `migrate api zero`) before applying the new initial migration. Verify the current Neon DB state before running `migrate`.
- Natural follow-ups after this PRD lands, in order: (1) signup/login API endpoints; (2) manual-recipe CRUD endpoints; (3) AI extraction features one at a time, each as its own PRD.
