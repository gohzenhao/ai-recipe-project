# PRD 0002: Signup and login — session-cookie auth for the SPA

Status: draft

## Problem Statement

The schema for `User` and `Recipe` has landed (PRD 0001), but nothing in the running app is actually authenticated. The frontend `Login.tsx` is a stub that drops a literal string `"stub-jwt-token"` into `localStorage` and the backend has no auth endpoints at all — only `GET /api/health`. As a user I cannot create an account or log in; as a developer I cannot build any owner-scoped feature (recipe CRUD, AI extraction, etc.) on top of an `Owner` concept that nobody actually authenticates against. We need a real, minimal signup and login system so subsequent feature work has a real `request.user` to read.

## Solution

Implement a minimal session-cookie-based auth flow end-to-end:

1. **Backend** — four endpoints under `/api/auth/` (`signup`, `login`, `logout`, `me`), backed by a thin service layer that wraps Django's built-in `authenticate()` / `login()` / `logout()`. The existing custom `User` model and `UserManager` (PRD 0001) is the basis; the manager gets one change — lowercase the whole email on store — to close a known case-sensitivity footgun.
2. **Frontend** — replace the stub `auth-store` and `Login.tsx` with real form-driven flows. Add a `/signup` route. Add a single API-client wrapper that knows about `credentials: 'include'`, `X-CSRFToken`, and the 401-redirect rule, and rewrite the existing components to go through it. On every cold load, the SPA calls `GET /api/auth/me` to discover whether there is a live session and seeds the CSRF cookie in the same response.

The full design decision tree was walked in a separate grilling session; the resulting transport choice (cookies, not bearer tokens) is recorded in [ADR 0002](../adr/0002-spa-uses-session-cookies-not-bearer-tokens.md), which itself flows from [ADR 0001](../adr/0001-django-auth-with-custom-user-model.md).

## User Stories

End-user stories:

1. As a new user, I want to sign up with my email, a password, and a display name, so that I can start using the app without inventing a username.
2. As a new user, I want to be logged in automatically as soon as I successfully submit the signup form, so I don't have to retype credentials I just typed.
3. As a new user, I want signup to refuse my submission if my email is already registered, so I know to log in instead.
4. As a new user, I want the display name I pick at signup to be allowed to collide with another user's display name, so I'm not forced to add numbers to it.
5. As a returning user, I want to log in with the email and password I signed up with, so I can get back into the app.
6. As a returning user, I want a wrong password (or a typo in my email) to produce a single generic "invalid email or password" error, so a stranger probing the login form can't enumerate which emails are registered.
7. As a returning user, I want my email lookup at login to be case-insensitive (`Alice@example.com` matches `alice@example.com`), so I don't get locked out of my own account by an accidental capital letter.
8. As a logged-in user, I want a logout button that ends my session on the server (not just in the browser), so a stolen browser cookie stops working immediately.
9. As a logged-in user revisiting the app days later, I want the app to remember me — no re-login required until my session actually expires.
10. As a user, I want a brief loading state on cold load while the app figures out whether I'm still logged in, rather than seeing a flash of protected content before being kicked, so I don't see content I'm not entitled to.
11. As a user, I want my display name to be visible somewhere on the home page after I log in, so I have visible confirmation that I'm signed in as the right person.
12. As a user, I want my session to be terminated when I click logout regardless of which tab I click it from, so I'm not still authenticated in a tab I forgot about.
13. As a user, I want the signup form to reject obviously weak passwords (very short, all-numeric, all-common-words) using Django's built-in validators, so I'm nudged toward something not immediately guessable.

Developer / system stories:

14. As a developer, I want the SPA to authenticate via Django session cookies plus CSRF, not bearer tokens, so the transport matches ADR 0001's "no token-verification middleware" commitment.
15. As a developer, I want the entire auth surface to live behind four Django Ninja endpoints (`/api/auth/signup`, `/login`, `/logout`, `/me`), so the contract is small and easy to keep mental track of.
16. As a developer, I want an auth-services module that exposes `register_user(...)` and `authenticate_credentials(...)` as plain functions, so business rules (email canonicalization, duplicate detection) can be tested without spinning up the HTTP layer.
17. As a developer, I want `GET /api/auth/me` decorated with `@ensure_csrf_cookie`, so the SPA's cold-load `/me` call doubles as the CSRF cookie seeder — no separate `/csrf` endpoint and no extra roundtrip.
18. As a developer, I want a single frontend `apiFetch` wrapper that handles `credentials: 'include'`, `X-CSRFToken` headers, and 401-redirect-to-login, so feature code doesn't repeat that boilerplate at every call site.
19. As a developer, I want the frontend `auth-store` rewritten to hold `{ user, status }` instead of a token string, so the rest of the SPA can branch on a real "is this user authenticated" answer rather than "is there a string in localStorage".
20. As a developer, I want `ProtectedRoute` to wait for the cold-load auth check to resolve before deciding to render or redirect, so I don't paint a protected page and then kick the user (a flash-of-protected-content bug).
21. As a developer, I want the `UserManager._create_user` to lowercase the full email before save, so case-mismatches at login are impossible by construction rather than handled at every query site.
22. As a developer, I want `CORS_ALLOW_CREDENTIALS = True` set in settings and `credentials: 'include'` on every SPA fetch, so the session cookie can ride across the dev `:5173` → `:8000` origin boundary.
23. As a developer, I want a Django Ninja `SessionAuth` helper class registered on `/me` (and reusable for future protected endpoints), so adding auth to a new endpoint is a one-line declaration rather than a per-endpoint re-check of `request.user.is_authenticated`.

## Implementation Decisions

**Auth transport — cookies, not tokens (ADR 0002)**
- The SPA authenticates via Django's `sessionid` cookie. CSRF is enforced by `django.middleware.csrf.CsrfViewMiddleware`; the SPA reads the `csrftoken` cookie from `document.cookie` and echoes it in an `X-CSRFToken` header on every mutating request.
- The decision and trade-offs (CORS-with-credentials, CSRF header threading on the SPA) are recorded in [ADR 0002](../adr/0002-spa-uses-session-cookies-not-bearer-tokens.md). Reviewers should read ADR 0002 before suggesting Bearer-token alternatives.

**Backend modules**
- `UserManager._create_user` is modified to lowercase the entire email (`email.strip().lower()`) before persistence. The earlier `BaseUserManager.normalize_email` call (which only lowercases the domain) is replaced/augmented by this. No new field, no migration.
- A new **auth-services** module (`api/auth_services.py`, or similar) exposes two functions: `register_user(email, password, display_name) → User` and `authenticate_credentials(email, password) → User | None`. They centralize email canonicalization at the application boundary, raise/return on duplicate email and bad credentials respectively, and never touch HTTP. Endpoints call into these.
- A new **auth-endpoints** module (`api/auth.py`) hosts the four Django Ninja routes:
  - `POST /api/auth/signup` — accepts `{ email, password, display_name }`. Calls `register_user`, then `django.contrib.auth.login(request, user)` to establish the session, returns `200 { user }`. Duplicate email → `400` with a field-level error on `email`. Validator failures (password too short etc.) → `400` with the failing rule.
  - `POST /api/auth/login` — accepts `{ email, password }`. Calls `authenticate_credentials`, then `login(request, user)`. On failure returns `401` with a single generic error message and no field-level breakdown.
  - `POST /api/auth/logout` — calls `django.contrib.auth.logout(request)`, returns `204`. CSRF-protected like any other mutating call.
  - `GET /api/auth/me` — returns `200 { user }` if `request.user.is_authenticated`, else `401`. Decorated with `@ensure_csrf_cookie` so the response sets the `csrftoken` cookie regardless of auth state. This is the CSRF-seeding mechanism — no separate `/csrf` endpoint.
- A small **Ninja `SessionAuth`** class implementing the Ninja auth callable contract (`__call__(request) → User | None`). Registered on `/me` and exported for future protected endpoints.
- A new **auth-schemas** module (`api/auth_schemas.py`) declares the pydantic shapes: `UserOut { id, email, display_name, avatar_url }`, `SignupIn { email, password, display_name }`, `LoginIn { email, password }`. `UserOut` is the single User serialization used by signup, login, and me.
- `config/settings.py` gains `CORS_ALLOW_CREDENTIALS = True`. `SESSION_COOKIE_SAMESITE` is left at Django's `"Lax"` default — this works for the dev setup (frontend `localhost:5173`, backend `localhost:8000` are same-site under the eTLD+1 rule for `localhost`) and for any plausible production setup where frontend and API share a parent domain.

**Frontend modules**
- A new **API-client** module (`lib/api-client.ts`) exposes one function — `apiFetch(path, init)` — that injects `credentials: 'include'`, reads the `csrftoken` cookie from `document.cookie` and attaches it as `X-CSRFToken`, parses JSON, throws typed errors on non-2xx, and on a `401` clears the auth store and triggers a redirect to `/login`. Every other network call in the SPA goes through this — no raw `fetch` outside it.
- `lib/auth-store.ts` is rewritten. New shape: `{ user: User | null, status: 'loading' | 'authed' | 'anon', setUser(user), clear() }`. The `'loading'` state covers the cold-load window before the `GET /me` round-trip resolves.
- A new **auth-actions** module (`lib/auth.ts`) wraps `apiFetch` calls: `signup(payload)`, `login(payload)`, `logout()`, `fetchMe()`. Each updates the auth store on success/failure.
- `components/ProtectedRoute.tsx` is rewritten: render a spinner (or null) while `status === 'loading'`; render `<Outlet />` if `status === 'authed'`; `<Navigate to="/login" />` if `status === 'anon'`.
- `routes/Login.tsx` is rewritten as a real form. Fields: email, password. Submit → `login()` action → on success, navigate to `/`; on `401`, display the generic error inline.
- A new `routes/Signup.tsx` route is added. Fields: email, password, display_name. Submit → `signup()` action → on success, the auth store is already populated (signup returns the user) and the SPA navigates to `/`; on `400`, display field-level errors.
- `App.tsx` registers the new `/signup` route and triggers `fetchMe()` on mount (e.g. via a top-level `useEffect`), which puts the store into either `authed` or `anon` and unblocks `ProtectedRoute`.

**API contracts**
- All request and response bodies are JSON. Content-Type negotiation: backend expects `application/json` on `POST`.
- `UserOut` shape (single canonical user serialization): `{ id: number, email: string, display_name: string, avatar_url: string }`. `avatar_url` is `""` when unset (matches the model default).
- Error responses use Ninja's default `{ "detail": string }` shape for 401/general errors. Field-level errors on signup return `{ "detail": [...] }` per Ninja's validation convention.

**Behavioural defaults inherited from Django**
- Session lifetime: Django default `SESSION_COOKIE_AGE = 2 weeks`. No "remember me" toggle in this PRD.
- Password validation: Django's existing `AUTH_PASSWORD_VALIDATORS` chain in settings (`UserAttributeSimilarityValidator`, `MinimumLengthValidator` at default 8, `CommonPasswordValidator`, `NumericPasswordValidator`) applies to signup. No changes.

## Testing Decisions

Good tests for this PRD verify externally observable behaviour — the service-function contract, the HTTP request/response cycle (status, cookies, body), and the frontend module behaviour against a mocked transport. We do **not** test Django's session machinery, CSRF middleware internals, or Ninja's serialization.

**`UserManager` — extend existing tests** (`backend/api/tests.py`)
- `create_user("Alice@Example.com", ...)` stores `email == "alice@example.com"`. Asserts the new lowercase-on-store behaviour.
- `create_user("  alice@example.com  ", ...)` stores `email == "alice@example.com"` (strip behaviour).
- `create_user("alice@example.com", ...)` then a second `create_user("ALICE@example.com", ...)` raises `IntegrityError` — same email, different case, unique constraint still applies.
- Existing PRD-0001 tests (hashed password, blank-email rejection, `create_superuser` flags) remain green.

**Auth services** — new unit tests against `register_user` / `authenticate_credentials`, no HTTP
- `register_user(email, password, display_name)` happy path: returns a `User` with the email canonicalized to lowercase, password hashed (`user.check_password(password) is True`).
- `register_user` with an email that's already taken (any case variant) raises a domain-level "email already in use" error, not a raw `IntegrityError`.
- `register_user` with a weak password (e.g. `"abc"`) raises a validation error.
- `authenticate_credentials("Alice@example.com", correct_password)` returns the `User` when the stored email is `"alice@example.com"` (canonicalization at lookup).
- `authenticate_credentials("alice@example.com", wrong_password)` returns `None`.
- `authenticate_credentials("nobody@example.com", "anything")` returns `None` (no leak distinguishing "no such user" from "wrong password" — same return value).

**Auth endpoints** — integration tests via `django.test.Client` (or Ninja's test client)
- `POST /api/auth/signup` with valid payload: returns `200`, response JSON has `{ id, email, display_name, avatar_url }`, response sets a `sessionid` cookie, and a subsequent `GET /me` from the same client returns the same user.
- `POST /api/auth/signup` with an already-registered email: returns `400` with a field-level error on `email`.
- `POST /api/auth/login` with valid credentials: returns `200 { user }`, sets `sessionid` cookie, follow-up `GET /me` succeeds.
- `POST /api/auth/login` with wrong password: returns `401` with the generic error, no `sessionid` cookie set.
- `POST /api/auth/login` with mismatched email case (`Alice@example.com` for a user stored as `alice@example.com`): returns `200` — confirms case-insensitive lookup works at the endpoint level.
- `POST /api/auth/logout` while authenticated: returns `204`, subsequent `GET /me` returns `401`.
- `GET /api/auth/me` unauthenticated: returns `401`, response sets the `csrftoken` cookie (confirms `@ensure_csrf_cookie` works on the failure branch).
- `GET /api/auth/me` authenticated: returns `200 { user }`, response sets the `csrftoken` cookie.
- CSRF enforcement: `POST /api/auth/login` without the `X-CSRFToken` header fails (status depends on Ninja config but should be a 403 or similar non-2xx).

**Frontend API client + auth-store** — Vitest unit tests
- *Note: Vitest is not yet set up in `frontend/`. This PRD includes installing and configuring Vitest as a prerequisite. Suggested config: `vitest` + `@testing-library/react` + `jsdom`, mirroring the project's TypeScript-strict conventions.*
- `apiFetch` injects `credentials: 'include'` on every call (assert via a mocked `fetch`).
- `apiFetch` reads the `csrftoken` cookie and attaches it as `X-CSRFToken` on a `POST` (set `document.cookie` in test setup, mock `fetch`, assert headers).
- `apiFetch` on a `401` response calls the auth-store's `clear()` and triggers navigation to `/login`.
- `apiFetch` returns parsed JSON on a `200`.
- `auth-store` initial state has `status: 'loading'`.
- `auth-store.setUser(user)` transitions to `status: 'authed'`.
- `auth-store.clear()` transitions to `status: 'anon'` and sets `user: null`.

**Prior art**
- Backend: PRD 0001 established Django `TestCase`-based tests in `backend/api/tests.py`, run via `cd backend && uv run python manage.py test`. This PRD continues that convention; no new test runner.
- Frontend: no prior art. This PRD establishes Vitest as the frontend test runner.

## Out of Scope

- **Email verification** (no SMTP wiring, no confirmation tokens, no "click the link to activate" flow). Users are considered active the moment signup succeeds.
- **Password reset / forgot password** (requires SMTP, which is out of scope above).
- **2FA / TOTP / WebAuthn**. Single-factor only.
- **Rate limiting** on login or signup endpoints. The login endpoint is left open to brute-force / credential-stuffing in this PRD. This is the highest-priority follow-up if usage broadens beyond the project owner. Candidate libraries: `django-axes`, `django-ratelimit`.
- **Account lockout** after N failed login attempts.
- **"Remember me" toggle** on the login form. Session cookie age is the Django default (2 weeks) for everyone.
- **"Log out everywhere"** (terminate all sessions for a user). The data is server-side (sessions are rows in the `django_session` table) so this is straightforward to add later, but no UI or endpoint in this PRD.
- **Profile editing** (change email, change password, change display name, change avatar). Profile-edit endpoints are a follow-up PRD.
- **Social / OAuth login** (Google, GitHub, etc.).
- **Avatar upload pipeline**. The schema accepts `avatar_url`; this PRD does not expose a way to set it via the API. Signup defaults `avatar_url` to `""`.
- **Admin-side user management UI** beyond what Django admin already provides for free.
- **Migration off Neon Auth** (which is provisioned in the Neon project but unused — see ADR 0001).
- **Per-recipe authorisation logic** (ownership checks on `Recipe`). That's a separate PRD for the recipe CRUD endpoints; this PRD only establishes the `request.user`.

## Further Notes

- The dev-environment CORS reality (`localhost:5173` ↔ `localhost:8000`) works with `SameSite=Lax` and `CORS_ALLOW_CREDENTIALS = True`. In production, when the frontend and backend share a parent domain, the same configuration continues to work. If the frontend ever moves to a different eTLD+1 from the API (e.g. `recipes.com` ↔ `api.somewhere-else.com`), `SESSION_COOKIE_SAMESITE` will need to drop to `"None"` and `SESSION_COOKIE_SECURE` will need to be `True` — flag this in a follow-up if the deployment topology changes.
- The frontend stub `"stub-jwt-token"` in the current `auth-store.ts` is removed wholesale; there is no migration path for the stub state. Any browsers carrying the stub key in `localStorage` simply have it ignored after the rewrite (it's stale and means nothing).
- Once this PRD lands, the natural next PRDs in priority order are: (1) manual recipe CRUD endpoints owner-scoped to `request.user`; (2) profile-edit endpoints (display name, avatar URL, password change); (3) login rate-limiting as a small hardening PRD before the app is exposed beyond the project owner.
- The decision to put the CSRF-cookie-seeding side effect on `GET /me` (rather than a dedicated endpoint) is documented at the endpoint with a one-line comment, so a future reader doesn't strip `@ensure_csrf_cookie` thinking it's redundant.
