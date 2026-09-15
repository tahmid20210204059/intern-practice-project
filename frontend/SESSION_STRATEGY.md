# Session Persistence Strategy

**Chosen approach:** `localStorage` (token + user object), implemented in `lib/auth.ts`.

## Why
- The backend (`POST /auth/login`, `POST /auth/signup`) returns the JWT directly in the JSON
  response body, not as an `httpOnly` cookie. Given that contract, `localStorage` is the
  simplest client-side option that requires no backend changes.
- The token is read synchronously on every `apiCall()` (see `lib/api.ts`) and attached as
  `Authorization: Bearer <token>`, and persists across page refreshes and browser restarts
  until explicit logout.

## Trade-off (known limitation)
- `localStorage` is readable by any JavaScript running on the page, so it is vulnerable to
  token theft via XSS if a script-injection bug is ever introduced elsewhere in the app.
  An `httpOnly` cookie set by the backend would not have this exposure, but it requires the
  backend to issue `Set-Cookie` on login/signup and to read the cookie server-side, which is
  outside the current backend implementation.

## Future hardening (not implemented in this project)
- Move to backend-issued `httpOnly`, `Secure`, `SameSite=Strict` cookies for the access
  token, with CSRF protection on state-changing requests.

This is the strategy agreed for the current scope of this project (client-only token storage,
JSON-based auth API), documented here per the Day 4 requirement.