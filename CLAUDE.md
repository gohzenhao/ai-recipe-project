# Project Context

## Stack
- Frontend: React 18 + Vite + TypeScript + Tailwind (TBD)
- Backend: Django 6 + Django Ninja
- Database: Postgres (Neon)
- Package managers: npm (frontend), uv + pyproject.toml (backend)

## Structure
- `frontend/` — Vite app, all client code
- `backend/` — Django project, `config/` for settings, `api/` for endpoints
- API base URL: `/api/`

## Conventions
- TypeScript strict mode on frontend
- Python: ruff for linting, type hints required
- API endpoints: function-based via Django Ninja, not class-based
- Schemas live next to endpoints in each Django app
- Frontend filenames: PascalCase for components, kebab-case for everything else
- No default exports in TypeScript

## Don't
- Don't put business logic in views — use service functions
- Don't hardcode URLs — use env vars
- Don't commit `.env` files