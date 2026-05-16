# Slice 1: Login flow end-to-end (tracer bullet)

Type: AFK

## Parent

PRD: `docs/prd/0002-signup-and-login.md`. See also [ADR 0002](../adr/0002-spa-uses-session-cookies-not-bearer-tokens.md) for the cookies-not-tokens decision and [ADR 0001](../adr/0001-django-auth-with-custom-user-model.md) for the underlying Django-auth choice.

## What to build

Wire up the thinnest end-to-end path that lets a pre-existing user log in via the SPA and land on the home page with their display name visible. This is the **tracer-bullet** slice for the entire auth feature — it establishes every piece of substrate that signup (Slice 2) and logout (Slice 3) will reuse: backend services, the `/login` and `/me` endpoints, the Ninja session-auth callable, CSRF/CORS wiring, frontend `apiFetch`, the rewritten `auth-store`, `ProtectedRoute`, and the cold-load `/me` probe on app boot. Most of the PRD's developer-facing infrastructure lands here; subsequent slices just bolt new endpoints/forms onto these rails.

Authentication transport follows ADR 0002: Django `sessionid` cookie + CSRF cookie + `X-CSRFToken` header. No bearer tokens. CORS must allow credentials so the dev `:5173` ↔ `:8000` boundary works.

End-user demo when this slice lands: `manage.py createsuperuser` (or any other shell-created user), visit `/login`, submit the form, get redirected to `/`, see the display name on the home page. Reload the page — still logged in. Submit a wrong password — see a generic "invalid email or password" error inline. Submit `Alice@Example.com` for a user stored as `alice@example.com` — still works.

## Acceptance criteria

**Backend — `UserManager` change**
- [ ] `UserManager._create_user` lowercases (and strips) the full email before save. `BaseUserManager.normalize_email`'s domain-only behaviour is replaced/augmented by full lowercasing.
- [ ] Extended tests in `backend/api/tests.py`:
  - `create_user("Alice@Example.com", ...)` stores `email == "alice@example.com"`.
  - `create_user("  alice@example.com  ", ...)` stores `email == "alice@example.com"`.
  - Two `create_user` calls with the same email in different cases raises `IntegrityError`.
  - Existing PRD-0001 tests (hashed password, blank-email rejection, `create_superuser` flags) remain green.

**Backend — schemas and services**
- [ ] New `api/auth_schemas.py` defining the pydantic shapes used by every auth endpoint:
  - `UserOut { id: int, email: str, display_name: str, avatar_url: str }` — the single canonical user serialization (`avatar_url` is `""` when unset).
  - `LoginIn { email: str, password: str }`.
  - `SignupIn { email: str, password: str, display_name: str }` (declared here so Slice 2 can reuse without a separate slice for schemas).
- [ ] New `api/auth_services.py` exposing plain functions, no HTTP:
  - `authenticate_credentials(email, password) -> User | None` — canonicalizes the email at lookup, returns the `User` on success or `None` on either bad password OR no such user (no leak distinguishing the two).
  - `register_user(email, password, display_name) -> User` — included here (rather than deferred to Slice 2) because Slice 1's tests need it to set up authenticated fixtures. Canonicalizes email, runs Django's password validators, raises a domain-level "email already in use" error (not raw `IntegrityError`), returns the persisted `User`.
- [ ] Unit tests for both service functions, covering at minimum:
  - `authenticate_credentials("Alice@example.com", correct_password)` succeeds when stored email is `"alice@example.com"`.
  - `authenticate_credentials("alice@example.com", wrong_password)` returns `None`.
  - `authenticate_credentials("nobody@example.com", "anything")` returns `None`.
  - `register_user` happy path returns a `User` with email canonicalized and password hashed.
  - `register_user` with a duplicate email (any case variant) raises the domain-level error.
  - `register_user` with a weak password raises a validation error.

**Backend — HTTP layer**
- [ ] New `api/auth.py` Django-Ninja router mounted under `/api/auth/` exposing **two** endpoints in this slice:
  - `POST /api/auth/login` — accepts `LoginIn`, calls `authenticate_credentials`, then `django.contrib.auth.login(request, user)`. On success returns `200` with the `UserOut` body and sets `sessionid` cookie. On failure returns `401` with the generic `{ "detail": "Invalid email or password" }` shape and no `sessionid` cookie.
  - `GET /api/auth/me` — returns `200 { UserOut }` if `request.user.is_authenticated`, else `401`. Decorated with `@ensure_csrf_cookie` **on both branches** so the response sets the `csrftoken` cookie regardless of auth state. A one-line comment at the decorator explains why this lives here (CSRF seeding for the SPA's cold-load probe — no separate `/csrf` endpoint).
- [ ] Ninja `SessionAuth` callable class registered on `/me`, exported for reuse by future protected endpoints. Implements Ninja's `__call__(request) -> User | None` contract by returning `request.user if request.user.is_authenticated else None`.
- [ ] `config/settings.py` gains `CORS_ALLOW_CREDENTIALS = True`. `SESSION_COOKIE_SAMESITE` left at Django's `"Lax"` default (works for dev because `localhost:5173` and `localhost:8000` are same-site under the eTLD+1 rule, and for any plausible production setup where frontend and API share a parent domain).
- [ ] Integration tests (Django/Ninja test client) covering this slice's endpoints:
  - `POST /api/auth/login` with valid credentials returns `200 { user }`, sets `sessionid` cookie, follow-up `GET /me` from the same client returns the same user.
  - `POST /api/auth/login` with wrong password returns `401`, no `sessionid` cookie set.
  - `POST /api/auth/login` with `Alice@example.com` for a user stored as `alice@example.com` returns `200` (confirms case-insensitive lookup at the endpoint).
  - `GET /api/auth/me` unauthenticated returns `401` and sets the `csrftoken` cookie.
  - `GET /api/auth/me` authenticated returns `200 { user }` and sets the `csrftoken` cookie.
  - `POST /api/auth/login` without the `X-CSRFToken` header is rejected (status depends on Ninja config — assert non-2xx).

**Frontend — test runner**
- [ ] Vitest installed and wired in `frontend/` alongside `@testing-library/react` and `jsdom`, with a `test` script in `package.json`. Config mirrors the existing TypeScript-strict conventions. `npm test` runs the suite and reports green.

**Frontend — substrate**
- [ ] New `lib/api-client.ts` exporting a single `apiFetch(path, init)` function that:
  - Always sets `credentials: 'include'`.
  - Reads the `csrftoken` cookie from `document.cookie` and attaches it as the `X-CSRFToken` header on every request (cheap to send on `GET`; required on mutating methods).
  - Parses JSON on success and throws typed errors on non-2xx.
  - On `401`, clears the auth store and triggers a redirect to `/login` — no other call site needs to repeat this logic.
- [ ] `lib/auth-store.ts` rewritten. Old `{ token }` shape and any `"stub-jwt-token"` reference removed wholesale (no migration shim for stale `localStorage` keys). New shape: `{ user: User | null, status: 'loading' | 'authed' | 'anon', setUser(user), clear() }`. Initial `status` is `'loading'`.
- [ ] New `lib/auth.ts` exposing the auth actions used by this slice: `login(payload)` and `fetchMe()`. Each goes through `apiFetch` and updates the store on success/failure. `signup`/`logout` are stubbed for later slices or simply not present yet — Slice 2 and Slice 3 will add them.
- [ ] Vitest unit tests covering:
  - `apiFetch` injects `credentials: 'include'` on every call.
  - `apiFetch` reads `csrftoken` from `document.cookie` and attaches it as `X-CSRFToken` on a `POST`.
  - `apiFetch` on a `401` response calls `auth-store.clear()` and triggers navigation to `/login`.
  - `apiFetch` returns parsed JSON on a `200`.
  - `auth-store` initial state has `status: 'loading'`.
  - `auth-store.setUser(user)` transitions to `status: 'authed'`.
  - `auth-store.clear()` transitions to `status: 'anon'` and sets `user: null`.

**Frontend — UI**
- [ ] `components/ProtectedRoute.tsx` rewritten: render a spinner (or `null`) while `status === 'loading'`; render `<Outlet />` if `status === 'authed'`; render `<Navigate to="/login" />` if `status === 'anon'`. No more reading `localStorage` directly.
- [ ] `routes/Login.tsx` rewritten as a real form. Fields: `email`, `password`. Submit invokes `login()`; on success, navigates to `/`; on `401`, displays the single generic "invalid email or password" error inline (no field-level breakdown).
- [ ] `App.tsx` invokes `fetchMe()` once on mount (e.g. top-level `useEffect`) so the store leaves the `'loading'` state and `ProtectedRoute` can decide. This is what closes the flash-of-protected-content gap.
- [ ] `routes/Home.tsx` displays `user.display_name` somewhere visible, so the dev demo confirms "logged in as the right person" without poking at devtools.

**Cross-cutting**
- [ ] `python manage.py test` passes against the Neon test database (extends the PRD-0001 suite).
- [ ] `npm test` in `frontend/` passes.
- [ ] Manual end-to-end smoke: create a user via `manage.py shell`/`createsuperuser`, log in via the SPA, see the display name on `/`, reload the page and stay logged in.

## Blocked by

None — can start immediately.
