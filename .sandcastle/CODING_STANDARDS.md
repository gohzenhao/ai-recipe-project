# Coding Standards

<!-- The reviewer agent loads this during code review via @.sandcastle/CODING_STANDARDS.md,
     so standards are enforced at review time without costing tokens during implementation.
     These reflect the conventions already established in backend/ and frontend/. -->

## Domain language

Use the exact terms from `CONTEXT.md` in code, identifiers, comments, and commit messages:
**User**, **Recipe**, **RecipeIngredient**, **RecipeSource**, **Owner**, **Source** (= `RecipeSource`).
Avoid the banned synonyms (e.g. bare "Ingredient", "Account", "Dish", "Author"). A model or
variable named after a banned term is a review finding.

## General

- Comments explain **why**, not **what**. The codebase uses comments to justify non-obvious
  decisions (security trade-offs, CSRF rotation, 401 bounce). Match that — drop comments that
  merely restate the code.
- No hardcoded URLs or secrets — use env vars (`VITE_API_BASE_URL`, `.env`).
- Prefer explicit, verbose code over clever abstractions.

## Backend (Django 6 + Django Ninja, Python 3.13)

### Layering — keep these three responsibilities in separate modules per app
- **`*_schemas.py`** — Ninja `Schema` classes for request/response DTOs. Schemas live next to
  the endpoints that use them.
- **Router modules** (e.g. `auth.py`) — `ninja.Router` with **function-based** endpoints (never
  class-based). Endpoints stay thin: validate payload → call a service → map the result to a
  `(status, body)` tuple. Declare every status in `response={200: UserOut, 400: dict}`.
- **`*_services.py`** — plain functions with **no HTTP and no request objects**. All business
  logic lives here. Services raise domain exceptions (e.g. `EmailAlreadyInUseError`); the router
  catches them and maps to field-level error responses
  (`{"detail": [{"loc": [...], "msg": ..., "type": ...}]}`).
- `views.py` holds no business logic.

### Style
- `from __future__ import annotations` at the top of every module.
- Type hints required everywhere, including `-> None`. Use modern syntax (`str | None`, not `Optional`).
- ruff is the linter: line-length **100**, target `py313`, rules `E,F,I,UP,B,DJ`. Code must pass
  `uv run ruff check .` with no suppressions unless justified inline.

### Models & migrations
- Reference the user via `settings.AUTH_USER_MODEL`, never by importing `User` directly in FKs.
- Every FK sets an explicit `related_name`. Every model defines `__str__`.
- Use `Meta.ordering` and named `UniqueConstraint`s (give each constraint an explicit `name`).
- Use `TextChoices` for enumerations. Normalize user input at the boundary (emails are stripped
  and fully lowercased before storage/lookup).
- Run `makemigrations --name <snake_case_description>` — never accept `auto_<timestamp>` names.

### Security
- No user-enumeration leaks: auth lookups return the same result for "wrong password" and
  "no such user" (return `None`, don't branch the response).
- Wrap multi-step writes in `transaction.atomic()`.
- CSRF is enforced through the cookie-auth classes (`SessionAuth` / `_CsrfAuth`) on mutating
  endpoints — don't add endpoints that mutate state without CSRF protection.

### Tests (`api/tests.py`, Django `TestCase`)
- One `TestCase` subclass per behavior group; method names read as `test_<expected_behavior>`,
  typed `-> None`.
- Cover **both** the service layer and the endpoint layer.
- For endpoints, use `Client(enforce_csrf_checks=True)` and assert status code, response body,
  **and** cookies (sessionid/csrftoken) where relevant.
- Run with `uv run python manage.py test`.

## Frontend (React 19 + Vite + TypeScript)

### Style & exports
- TypeScript **strict** mode. **No default exports** — named exports only.
- Filenames: **PascalCase** for components (`Login.tsx`), **kebab-case** for everything else
  (`api-client.ts`, `auth-store.ts`).
- Import types with `import type { ... }`; use the `@/` alias for `src/`.

### Layering
- **`lib/api-client.ts`** is the single network entry point: one `apiFetch<T>()` wrapper that
  injects the CSRF header from the cookie, sends `credentials: 'include'`, and centralizes the
  `401 → clear store → bounce to /login` behavior. Throw `ApiError` (carrying `status` + `body`)
  on non-OK responses. Feature code must not call `fetch` directly.
- **Feature API modules** (e.g. `lib/auth.ts`) wrap `apiFetch` and update the store; they own the
  "why" comments about edge cases (e.g. informational probes pass `bounceOn401: false`).
- **State** lives in Zustand stores (`lib/*-store.ts`) created with `create<State>()(...)`.
- **Route/page components** (`routes/*.tsx`) hold local `useState` form state, submit via
  `try/catch/finally`, and map errors by checking `err instanceof ApiError` + `err.status`.

### Styling & accessibility
- Tailwind utility classes inline, using **semantic design tokens** (`bg-background`,
  `text-foreground`, `text-destructive`, `border-input`, `bg-primary`) — not raw color values.
- Reuse shadcn components from `components/ui/`.
- Inputs are labeled and carry `autoComplete` + `required`; surface errors with `role="alert"`.

### Tests
- Unit/component tests with Vitest + Testing Library (co-located `*.test.ts(x)`): `npm run test`.
- E2E flows with Playwright in `e2e/`: `npm run e2e`.
- Lint + typecheck before commit: `npm run lint` and `npm run build` (`tsc -b && vite build`).

## Review feedback loops

Confirm the checks for the touched layer pass, and flag if they were skipped:
- Backend changed → `cd backend && uv run ruff check .` + `uv run python manage.py test`.
- Frontend changed → `cd frontend && npm run lint` + `npm run build` (and `npm run test` for logic).
