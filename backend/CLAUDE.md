# Backend (Django 6 + Django Ninja)

## Conventions
- Python: ruff for linting, type hints required
- API endpoints: function-based via Django Ninja, not class-based
- Schemas live next to endpoints in each Django app
- Django migrations: always run `makemigrations` with `--name <snake_case_description>` so the file name describes the change (no `auto_<timestamp>` names)

## Don't
- Don't put business logic in views — use service functions
