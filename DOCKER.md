# Day 19 — Dockerization and Release Candidate

## Start the whole project from a clean checkout

```powershell
git clone <repo-url>
cd intern-practice-project
copy .env.example .env
```

Edit `.env` and set at least `JWT_SECRET` to a random string of 32+ characters (the example value must be replaced).
Optional: Cloudinary (avatar/image uploads), Groq (AI summaries; a mock summarizer is used without a key), admin seed values.

```powershell
docker compose up --build -d
docker compose ps
```

| Service  | URL                              | Notes                                              |
|----------|----------------------------------|----------------------------------------------------|
| frontend | http://localhost:3000            | Next.js standalone, health: `/api/health`          |
| backend  | http://localhost:5000            | NestJS, health: `/health`, `/health/live`, `/health/ready` |
| mongo    | internal only (`mongo:27017`)    | single-node replica set `rs0`, volume `mongo-data` |

Startup order is enforced with health checks: `mongo` healthy -> `backend` healthy (`/health/ready` pings MongoDB) -> `frontend`.

Create the first admin (needs `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`):

```powershell
docker compose exec backend npm run seed:admin
```

Useful commands:

```powershell
docker compose logs -f backend
docker compose down
docker compose down -v
```

`down -v` also deletes the database volume.

## How the services connect

- Browser -> frontend (`localhost:3000`). The frontend calls the API from the browser using `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`).
- `NEXT_PUBLIC_API_URL` is inlined at **build time**. After changing it run `docker compose build frontend`.
- Backend -> MongoDB via `MONGO_URI=mongodb://mongo:27017/<db>?replicaSet=rs0` on the private `internal` network.
- CORS: the backend allows `FRONTEND_URL` plus any `CORS_ORIGINS` (comma separated). Both must match the browser origin exactly.
- Refresh-token cookie: compose sets `COOKIE_SECURE=false` and `COOKIE_SAMESITE=lax` so login works over plain `http://localhost`. When deploying behind HTTPS on separate sites use `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`. If unset, production defaults are `Secure` + `SameSite=None`.
- MongoDB must run as a replica set because reactions use multi-document transactions. A plain standalone `mongod` will break reactions.

## Without Docker (local dev)

```powershell
cd backend ; copy .env.example .env ; npm ci ; npm run start:dev
cd frontend ; copy .env.example .env.local ; npm ci ; npm run dev
```

## Verification run (clean `npm ci`)

| Check | Result |
|-------|--------|
| backend `npm run lint` | 0 errors, 2 warnings |
| backend `npm test` | 18 suites, all pass (health spec extended to 8 tests) |
| backend `npm run build` | passes, output `dist/main.js` |
| frontend `npm run lint` | 0 errors, 68 warnings (see known issues) |
| frontend `npm test` | 17 files, 147 tests pass |
| frontend `npm run build` | passes, `.next/standalone/server.js` produced; standalone server verified: `/api/health` 200, `/login` 200, unknown route 404 |
| `docker compose config` | valid |

Not executed in the authoring environment: `docker compose up` (no Docker daemon was available there). Run it once on your machine and tick the checklist below.

### Release-candidate checklist (run locally)

- [ ] `docker compose up --build -d` -> all three services `healthy`
- [ ] http://localhost:5000/health/ready returns `{"success":true,"data":{"status":"ok","database":"connected"}}`
- [ ] http://localhost:3000/status shows API ok and Database connected
- [ ] Sign up, log in, refresh the page (session survives via refresh cookie), log out
- [ ] Create a post, comment, react (confirms the replica-set transaction path)
- [ ] `docker compose restart backend` -> frontend recovers without rebuild

## What changed in Day 19

- `backend/Dockerfile`, `backend/.dockerignore`: multi-stage (deps, build, prod-deps, runtime), non-root user, tini, `HEALTHCHECK` on `/health/ready`.
- `frontend/Dockerfile`, `frontend/.dockerignore`: multi-stage, `NEXT_PUBLIC_API_URL` build arg, Next standalone runtime, non-root, `HEALTHCHECK` on `/api/health`.
- `docker-compose.yml`, `.env.example`, `frontend/.env.example`: full stack configuration.
- Backend health: `/health` (adds uptime, timestamp), new `/health/live` and `/health/ready` (503 when MongoDB is unreachable); spec extended.
- Backend: optional `COOKIE_SECURE` / `COOKIE_SAMESITE` overrides, `enableShutdownHooks()`, listens on `0.0.0.0`, `start:prod` uses `dist/main.js`, new `seed:admin` script with `seed-admin.cjs`.
- Frontend: `output: 'standalone'`, `/api/health` route (+test), `not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx`.
- Frontend fonts: Geist is now self-hosted through the `geist` package instead of fetching Google Fonts during `next build` (the Docker build previously needed internet access to Google).
- Responsive review: Navbar no longer overlaps on narrow phones; admin user table scrolls horizontally with tighter padding; admin page shows an error when the user list fails to load; dashboards use smaller side padding on mobile.
- Lint: fixed 5 genuine errors (unescaped apostrophes, two intentional effect fetches annotated). `no-explicit-any` is now a warning.

## Known issues and launch blockers

Launch blockers (must be handled for a public deployment):

1. **Rate limiting is in memory** (`RateLimitGuard`, `SearchRateLimitGuard`). Run exactly one backend replica; limits reset on restart. Behind a reverse proxy set `TRUST_PROXY` (for example `1`) or every client shares one IP bucket.
2. **MongoDB has no authentication** in the compose file (isolated on the internal network, no host port). Do not publish port 27017. For a shared host enable auth with a replica-set keyFile or use a managed cluster (MongoDB Atlas) via `MONGO_URI`.
3. **HTTPS is not provided.** Put a TLS-terminating proxy in front and switch cookies to `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` (or serve API and web on the same site).
4. **`JWT_SECRET` must be replaced.** The example text is long enough to pass validation but is public.
5. **Image uploads depend on external config:** they fail without Cloudinary credentials.

Non-blocking:

- Frontend lint has 68 warnings (mostly `no-explicit-any` in API payloads and test mocks); backend lint has 2 warnings.
- `NEXT_PUBLIC_API_URL` requires a frontend rebuild to change.
- Mongo URI passwords (when using Atlas) containing special characters must be URL-encoded.
- Original `seed-admin.js` fails under `"type": "module"` (uses `require`); use `npm run seed:admin` (`seed-admin.cjs`). The other legacy scripts (`restore-admin.js`, `check-users.js`) have the same limitation.
- Root `README.md` is UTF-16 encoded and was not modified; this file is the Docker documentation.