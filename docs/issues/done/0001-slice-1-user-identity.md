# Slice 1: User identity foundation

Type: AFK
Label to apply on publish: `ready-for-agent`

## Parent

PRD draft: `docs/prd/0001-initial-schema.md` (to be replaced with a GitHub Issue link once the PRD itself is published).

## What to build

Land the custom Django user model and its supporting wiring so that subsequent feature work has a stable identity foundation. Email becomes the unique login identifier, with `display_name` (non-unique) for UI bylines and an optional `avatar_url`. Drop Django's default `username`. Provide a custom `UserManager` (required because we removed `username`) that owns the `create_user` / `create_superuser` contract. Set `AUTH_USER_MODEL` in settings **before** running the first migration against the Neon database. Register the User in Django admin so it's inspectable during development. Apply the initial migration to Neon. Verify with tests for the manager contract and the email-uniqueness invariant.

## Acceptance criteria

- [ ] `api.User` is an `AbstractUser` subclass with `username = None`, `email` as a unique `EmailField`, required non-unique `display_name`, blank-allowed `avatar_url` (URL field).
- [ ] `USERNAME_FIELD = "email"` and `REQUIRED_FIELDS = ["display_name"]`.
- [ ] A custom `UserManager` exposes `create_user(email, password=None, **extra_fields)` and `create_superuser(email, password=None, **extra_fields)`. Blank email raises `ValueError`.
- [ ] `AUTH_USER_MODEL = "api.User"` is set in `config/settings.py` before any migration runs against Neon. If a prior migration has already created Django's default `auth_user` table on Neon, that state is reset before this slice's migration is applied.
- [ ] `User` is registered in Django admin.
- [ ] The initial Django migration is created with a descriptive `--name` (per `backend/CLAUDE.md`) and applied successfully to Neon.
- [ ] Tests in `api/tests.py` cover:
  - `create_user` hashes the password (no plaintext storage), defaults `is_staff` to `False` and `is_superuser` to `False`, and raises `ValueError` on blank email.
  - `create_superuser` sets both `is_staff` and `is_superuser` to `True`.
  - Inserting two users with the same email raises `IntegrityError`.
- [ ] `python manage.py test` passes against the Neon test database.

## Blocked by

None — can start immediately.
