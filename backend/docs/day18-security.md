# Day 18 — Security and session hardening

## Session strategy
- Access token: JWT, ACCESS_TOKEN_EXPIRY (default 15m), sent as Bearer header, kept in memory on the client.
- Refresh token: random 80 hex chars, stored only as sha256 hash, sent only as httpOnly cookie `refresh_token` (path /auth), rotated on every POST /auth/refresh. A reused old token is rejected with 401.
- Refresh and logout read the cookie only. Tokens are never returned in JSON bodies.
- POST /auth/refresh and /auth/logout reject a browser Origin that is not allowed (403).
- Changing the password revokes the stored refresh token.

## Rate limits (in memory, per process)
| Endpoint | Limit | Key |
|---|---|---|
| POST /auth/signup | 10 / hour | ip |
| POST /auth/login | 10 / 15 min | ip |
| POST /auth/refresh | 60 / 15 min | ip |
| POST /auth/logout | 30 / 15 min | ip |
| GET /posts/search | 30 / 10 s | user |
| POST /posts/:id/summarize | 5 / min | user |
| POST /posts | 20 / min | user |
| PATCH /users/me/password | 5 / 15 min | user |
| POST /uploads/* | 20 / min | user |
Exceeded: 429 with Retry-After. Set TRUST_PROXY=1 behind a reverse proxy so the real client ip is used.

## Input limits
- JSON and urlencoded body: 100kb (413 otherwise). Malformed JSON: 400.
- Uploads: avatar 2MB, post image 5MB, images only.
- signup: name 120, email 254, password 8-72 chars. login password max 128.

## CORS
Allowed origins: FRONTEND_URL, CORS_ORIGINS (comma list), plus localhost and hoppscotch only when NODE_ENV is not production. Other origins get no CORS headers.

## Environment
Startup fails when MONGO_URI or JWT_SECRET is missing. In production JWT_SECRET must be 32+ chars and not a placeholder, and FRONTEND_URL is required. Never commit .env.

## Logging
Request log is `METHOD path status ms` without query string, headers or body. Errors are passed through a redactor (bearer tokens, JWTs, gsk_ keys, mongo credentials, password/token/secret values, emails). 500 responses never expose internals.

## Swagger
/api-docs, disabled in production unless SWAGGER_ENABLED=true. Bearer and cookie auth schemes, shared ErrorResponse schema, 400/401/403/404/413/429/500 added to every relevant operation.