# Project Context

## Summary
This is a monorepo project that allows users to signup/login and manage their recipes.

## Basic features
- Login/signup for users
- View recipes
- Create recipes manually

## AI features
- Paste a URL and have AI extract recipes
- Upload screenshots/images of recipes have AI extract them
- Smart ingredient substitutions on saved recipes
- Smart recipe scaling

## Stack
- Frontend: React 18 + Vite + TypeScript + Tailwind (TBD)
- Backend: Django 6 + Django Ninja
- Database: Postgres (Neon)
- Package managers: npm (frontend), uv + pyproject.toml (backend)

## Structure
- `frontend/` — Vite app, all client code (see `frontend/CLAUDE.md` for frontend-specific rules)
- `backend/` — Django project, `config/` for settings, `api/` for endpoints (see `backend/CLAUDE.md` for backend-specific rules)
- API base URL: `/api/`

## Cross-cutting rules
- Don't hardcode URLs — use env vars
- Don't commit `.env` files (use `.env.example` for templates)
