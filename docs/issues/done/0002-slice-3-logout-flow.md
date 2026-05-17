# Slice 3: Logout flow

Type: AFK

## Parent

PRD: `docs/prd/0002-signup-and-login.md`. See also [ADR 0002](../adr/0002-spa-uses-session-cookies-not-bearer-tokens.md).

## What to build

Bolt the logout flow on top of the auth substrate established by Slice 1. A logged-in user clicks a logout control somewhere reachable from the home page, the request terminates the session **server-side** (so a stolen `sessionid` cookie stops working immediately — not just a client-side `localStorage` wipe), and the SPA navigates back to `/login`. Because logout invalidates the session row in `django_session`, every other browser tab pointed at the app will fail its next `apiFetch` with `401` and be auto-redirected to `/login` by the `apiFetch` 401-handler that Slice 1 introduced — covering the "log out from one tab, get kicked out of all tabs" expectation without any extra cross-tab plumbing.

End-user demo when this slice lands: log in, click the logout button on the home page, get redirected to `/login`. Reload `/` — still redirected to `/login` (no flash of protected content). Open a second tab logged in as the same user before clicking logout, then click logout in the first tab, then click any link in the second tab — the second tab's next API call returns `401` and the user is redirected to `/login` there too.

## Acceptance criteria

**Backend**
- [ ] `POST /api/auth/logout` added to `api/auth.py`. Calls `django.contrib.auth.logout(request)` (which deletes the row from `django_session` and clears the `sessionid` cookie) and returns `204` with no body.
- [ ] CSRF-protected like every other mutating endpoint — must accept the `X-CSRFToken` header that the SPA sends via `apiFetch`.
- [ ] Integration tests (Django/Ninja test client) covering:
  - `POST /api/auth/logout` while authenticated returns `204`, and a subsequent `GET /api/auth/me` from the same client returns `401` (confirms server-side session invalidation, not just a client-side cookie wipe).
  - `POST /api/auth/logout` without the `X-CSRFToken` header is rejected (status depends on Ninja config — assert non-2xx).

**Frontend**
- [ ] `lib/auth.ts` (introduced in Slice 1) gains a `logout()` action: `apiFetch('POST /api/auth/logout')`, on success calls `auth-store.clear()` and navigates to `/login`. Failure path: if for any reason the request errors (network, 500), still clear the store and redirect — a user clicking logout should never end up in a half-logged-out state on the client.
- [ ] A logout control reachable from the home page invokes `logout()`. A plain button somewhere visible (e.g. next to the display name in `routes/Home.tsx`) is sufficient — no header component refactor required in this slice.
- [ ] Vitest unit test for the `logout()` action: on `204` it calls `auth-store.clear()` and triggers navigation to `/login`.

**Cross-cutting**
- [ ] `python manage.py test` passes (Slice 1's suite remains green; new logout integration tests pass).
- [ ] `npm test` in `frontend/` passes.
- [ ] Manual end-to-end smoke: log in, click logout, get redirected to `/login`; reload `/` and stay on `/login`. Multi-tab: log in in two tabs, log out in tab A, click around in tab B → tab B gets `401` on its next API call and is redirected to `/login` by `apiFetch`'s 401-handler (no extra code in this slice — just verify the behaviour falls out of Slice 1's substrate).

## Blocked by

Slice 1 (Login flow end-to-end) — depends on the `auth.py` router, `auth-store`, `apiFetch`'s 401-handler, and the existence of a logged-in user to log out.

Can run in parallel with Slice 2 (Signup flow) once Slice 1 lands.
