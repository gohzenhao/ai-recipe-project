# Slice 2: Signup flow

Type: AFK

## Parent

PRD: `docs/prd/0002-signup-and-login.md`. See also [ADR 0002](../adr/0002-spa-uses-session-cookies-not-bearer-tokens.md).

## What to build

Bolt the signup flow on top of the auth substrate established by Slice 1. A brand-new visitor lands on `/signup`, enters email + password + display name, submits, and is immediately authenticated — no second trip through `/login` needed. Duplicate emails (any case variant) and Django's password validators reject submissions with clear field-level errors. Display-name collisions are explicitly allowed (no uniqueness enforcement) so users aren't forced to add numbers to their name.

Most of the heavy lifting (the `register_user` service, the `SignupIn`/`UserOut` schemas, `apiFetch`, the `auth-store`, the cold-load `/me` probe) already exists from Slice 1. This slice contributes the `POST /api/auth/signup` endpoint and the matching frontend route + action.

End-user demo when this slice lands: hit `/signup`, fill the form, submit, land on `/` with the new display name visible (no re-login). Try to sign up with an email already in use — see a field-level error on `email`. Try a too-short or all-numeric password — see the failing validator's message on `password`.

## Acceptance criteria

**Backend**
- [ ] `POST /api/auth/signup` added to `api/auth.py`, accepting `SignupIn` (already declared in `auth_schemas.py` during Slice 1).
- [ ] On success, the endpoint:
  - Calls `register_user(email, password, display_name)` (already implemented in Slice 1) to canonicalize the email, run validators, and persist the `User`.
  - Calls `django.contrib.auth.login(request, user)` to establish the session immediately — the response sets `sessionid` so the SPA does not need to follow up with a separate `/login` round-trip.
  - Returns `200` with the `UserOut` body.
- [ ] On duplicate email (any case variant — caught by the canonicalization done in `register_user`), the endpoint returns `400` with a field-level error on `email` in Ninja's `{ "detail": [...] }` validation-error convention. No `sessionid` cookie is set.
- [ ] On Django password-validator failure (`MinimumLengthValidator`, `CommonPasswordValidator`, `NumericPasswordValidator`, `UserAttributeSimilarityValidator` — all already configured by Django defaults), the endpoint returns `400` with a field-level error on `password` naming the failing rule. No `sessionid` cookie is set.
- [ ] Integration tests (Django/Ninja test client) covering:
  - `POST /api/auth/signup` with a valid payload returns `200`, response body is `{ id, email, display_name, avatar_url }` with `avatar_url == ""`, response sets `sessionid` cookie, follow-up `GET /me` from the same client returns the same user.
  - `POST /api/auth/signup` with an already-registered email (exact case match) returns `400` with a field-level `email` error and no `sessionid` cookie.
  - `POST /api/auth/signup` with an already-registered email in different casing (`ALICE@example.com` when `alice@example.com` exists) ALSO returns `400` — confirms canonicalization at registration matches canonicalization at lookup.
  - `POST /api/auth/signup` with a weak password (e.g. `"abc"`) returns `400` with a `password` field-level error.
  - `POST /api/auth/signup` allows two distinct users to share the same `display_name` without error (display-name collisions are explicitly allowed by the model and must remain allowed at the endpoint).

**Frontend**
- [ ] `lib/auth.ts` (introduced in Slice 1) gains a `signup(payload)` action: `apiFetch('POST /api/auth/signup', body)`, on success updates the auth store via `setUser(...)` (since the backend already established the session, no follow-up `fetchMe()` is needed), on `400` surfaces the field-level errors to the caller.
- [ ] New `routes/Signup.tsx` containing a real form with fields `email`, `password`, `display_name`. Submit invokes `signup()`. On success, navigate to `/`. On `400`, render the field-level errors inline next to the offending fields (separate messages for the email-already-in-use case and for password-validator failures).
- [ ] `App.tsx` registers `/signup` as a public route (no `ProtectedRoute` wrapper — anonymous visitors must be able to reach it).
- [ ] `routes/Login.tsx` includes a visible link to `/signup` (a small "Create an account" link on the login form is enough — no need for a separate marketing surface).

**Cross-cutting**
- [ ] `python manage.py test` passes (Slice 1's suite remains green; new signup integration tests pass).
- [ ] `npm test` in `frontend/` passes.
- [ ] Manual end-to-end smoke: visit `/signup`, sign up with a fresh email, land on `/` with the new display name visible.

## Blocked by

Slice 1 (Login flow end-to-end) — depends on `auth_services.register_user`, the `SignupIn`/`UserOut` schemas, the `auth.py` router, `apiFetch`, `auth-store`, and the cold-load `/me` probe, all of which are established by Slice 1.

Can run in parallel with Slice 3 (Logout flow) once Slice 1 lands.
