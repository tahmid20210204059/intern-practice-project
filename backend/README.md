# Backend (NestJS API)

REST API for the Dev Community platform. NestJS 12 (ESM, `.js` import suffixes), Mongoose 9, JWT auth.

## Setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run seed:admin
npm run start:dev
```

Default port from `.env.example` is 5000 (the code falls back to 3000 if `PORT` is unset).

### Scripts

| Script | What |
|---|---|
| `npm run start:dev` | Watch mode |
| `npm run build` / `npm run start:prod` | Compile / run `dist/main.js` |
| `npm run seed:admin` | Create the admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (skips if it exists) |
| `npm run lint` | oxlint on `src/` and `test/` |
| `npm test` | Unit tests (Jest, ESM) |
| `npm run test:cov` | Coverage |
| `npm run test:e2e` | e2e config `test/jest-e2e.json` |

Helper scripts (`node <file>` after `.env` is set): `check-users.js`, `restore-admin.js`, `seed-admin.js`, `seed-day13-ranking.cjs`, `seed-day14-feed-test.cjs`.

## Environment variables

See the table in the root [README](../README.md#environment-variables). Startup validation (`src/common/config/env.validation.ts`) fails fast when `MONGO_URI` or `JWT_SECRET` is missing, and in production when `JWT_SECRET` is shorter than 32 characters or a placeholder, or `FRONTEND_URL` is missing.

## Modules

| Module | Responsibility |
|---|---|
| `auth` | signup, login, refresh, logout, `me`; JWT strategy, `JwtAuthGuard`, `RolesGuard`, `@Roles` |
| `users` | own account (skills, experiences, education, links, password, delete) and admin user management |
| `profile` | own profile read/update including portfolio projects |
| `posts` | CRUD, soft delete + restore, ranked/latest/discussed feed, text search, AI summarize, admin trash, daily cleanup cron |
| `comments` | threaded comments (max depth 3), cascade delete |
| `reactions` | toggle/switch reactions on posts and comments (transaction based) |
| `notifications` | per-user notifications, unread count, mark read |
| `uploads` | avatar (max 2 MB) and post image (max 5 MB) upload to Cloudinary, images only |
| `summarizer` | Groq-based summary + tags, mock fallback without a key |
| `health` | `/health`, `/health/live`, `/health/ready`, `/health/admin-only` |
| `common` | env validation, CORS, security headers, request logger with redaction, rate-limit guard, Swagger setup, response interceptor, exception filter |

Responses: success is `{ "success": true, "data": ... }`; errors are `{ "success": false, "statusCode", "message", "errors": [] }`. Body size limit is 100 kb.

## Database models (MongoDB collections via Mongoose)

| Model | Key fields |
|---|---|
| User | `name`, `email` (unique), `passwordHash`, `role` (`user`/`admin`), `headline`, `bio`, `avatarUrl`, `skills[]`, `experiences[]`, `education[]`, `portfolioProjects[]`, `links`, `refreshTokenHash`, `refreshTokenExpiresAt`, timestamps |
| Post | `authorId`, `title` (max 150), `body` (max 5000), `imageUrl`, `likeCount`, `commentCount`, `deletedAt` (null unless soft deleted), timestamps |
| Comment | `postId`, `authorId`, `parentCommentId`, `body` (max 2000), `depth` (0 to 3), `reactionCount`, timestamps |
| Reaction | `userId`, `targetType` (`post`/`comment`), `targetId`, `type` (`like`, `love`, `care`, `haha`, `wow`, `sad`, `angry`), timestamps |
| Notification | `user`, `message`, `read`, `postId`, `actorId`, timestamps |

Feed ranking: `log10(likes*1 + comments*2 + 1) - ageHours/36`.

## Authentication

- Signup/login return an access token (default 15 minutes) and set an httpOnly `refresh_token` cookie scoped to path `/auth`.
- `POST /auth/refresh` rotates the refresh token on every call; only a sha256 hash is stored in the database.
- `POST /auth/logout` clears the cookie.
- Cookie flags: `Secure` and `SameSite=None` in production, `SameSite=Lax` otherwise; override with `COOKIE_SECURE` / `COOKIE_SAMESITE`.
- Protected routes need `Authorization: Bearer <access_token>`. Admin routes additionally use `RolesGuard` with `@Roles('admin')`.
- Password rule: 8 to 72 characters with at least one lowercase, one uppercase and one digit.

## Endpoints

Auth (`/auth`): `POST signup`, `POST login`, `POST refresh`, `POST logout`, `GET me`

Posts (`/posts`, JWT): `POST /`, `GET /` (query: sort `latest|ranked|discussed`, pagination), `GET /search`, `GET /:id`, `POST /:id/summarize`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/restore`
Posts admin (`/posts/admin`, admin): `GET deleted`, `DELETE :id/permanent`

Comments (`/comments`, JWT): `POST /`, `GET /post/:postId`, `PATCH /:id`, `DELETE /:id`

Reactions (`/reactions`, JWT): `POST /`, `GET /me`, `GET /`

Notifications (`/notifications`, JWT): `GET /`, `GET /unread-count`, `PATCH /read-all`, `PATCH /:id/read`

Profile (`/profile`, JWT): `GET me`, `PATCH me`

Users (`/users`): `GET /` (admin), `GET me`, `PATCH me`, `PATCH me/skills`, `PATCH me/experiences`, `PATCH me/education`, `PATCH me/links`, `PATCH me/password`, `DELETE me`, `GET :id`, `PATCH :id` (admin), `DELETE :id` (admin), `PATCH :id/role` (admin)

Uploads (`/uploads`, JWT): `POST avatar`, `POST post-image`

Health: `GET /health`, `GET /health/live`, `GET /health/ready` (503 when MongoDB is unreachable), `GET /health/admin-only` (admin)

### Rate limits (in-memory)

| Route | Limit |
|---|---|
| `POST /auth/signup` | 10 per 60 min (per IP) |
| `POST /auth/login` | 10 per 15 min (per IP) |
| `POST /auth/refresh` | 60 per 15 min |
| `POST /auth/logout` | 30 per 15 min |
| `POST /posts` | 20 per minute per user |
| `POST /posts/:id/summarize` | 5 per minute per user |
| `PATCH /users/me/password` | 5 per 15 min per user |
| `POST /uploads/*` | 20 per minute per user |
| `GET /posts/search` | separate search guard |

### Permission rules

| Rule | Behaviour |
|---|---|
| Post edit / delete / restore | owner or admin, otherwise 403 |
| Restore | only within 5 days of deletion, otherwise 400; cron removes expired posts daily at 03:00 |
| Comment edit | author only |
| Comment delete | comment author, post owner, or admin; deletes all descendants |
| Reply depth | more than 3 levels returns 400 |
| User admin routes, admin trash, `health/admin-only` | admin only |

## Swagger

Available at `/api-docs` outside production, or in production when `SWAGGER_ENABLED=true`. Use "Authorize" with the access token from `POST /auth/login`. The refresh endpoint relies on the httpOnly cookie.

## Testing

```powershell
npm test
npm run test:cov
```

Unit tests cover auth service/guards, comments service, posts service, ranking and ordering, search query sanitising, reactions (service and toggle), summarizer, uploads, rate limiting, date-range validator, user DTO validation and health. `test/auth-flow.integration.spec.ts` covers an auth flow with a protected action.

## Docker

`backend/Dockerfile` is a multi-stage build (Node 22 Alpine, non-root user, tini, production dependencies only) and ships `seed-admin.cjs`. It has a health check on `/health/ready`.

```powershell
cd backend
docker build -t devcommunity-backend:1.0.0 .
docker run --rm -p 5000:5000 --env-file .env -e NODE_ENV=production -e FRONTEND_URL=http://localhost:3000 -e COOKIE_SECURE=false -e COOKIE_SAMESITE=lax devcommunity-backend:1.0.0
```

For the full stack use `docker compose up --build` from the repository root. The image does not contain `.env`; variables are passed at runtime.