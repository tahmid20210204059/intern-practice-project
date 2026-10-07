# Frontend (Next.js)

Next.js 16 (App Router) with React 19, TanStack Query, react-hook-form + zod and Tailwind 4.

## Setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The backend must be running at `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`).

| Script | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest (run once) |
| `npm run test:watch` | Vitest watch |

## Routing (`src/app`)

| Route | Page |
|---|---|
| `/` | Redirects to `/feed` when a session exists |
| `/login`, `/signup` | Auth forms |
| `/feed` | Feed with tabs Top / Latest / Most Discussed (`?sort=ranked\|latest\|discussed`) |
| `/search` | Post search |
| `/posts/new`, `/posts/[id]`, `/posts/[id]/edit` | Create, view (reactions, comments, summarizer), edit |
| `/profile/[id]`, `/profile/[id]/portfolio/[index]`, `/profile/edit` | Profile, portfolio project detail, profile editing |
| `/dashboard/user`, `/dashboard/admin` | Dashboards (admin page redirects non-admins to the user dashboard) |
| `/status` | Backend health check page |

Pages are protected inside each page component: without a session they redirect to `/login`.

## Code layout

- `src/features/<feature>/` holds `components`, `queries`, `mutations`, `schemas`, `types` and `utils` for auth, posts, comments, reactions, profile and notifications.
- `src/lib/http/client.ts` is the API client. `src/lib/auth.ts` holds session helpers.
- `src/providers/` holds `QueryProvider` and `SessionExpiryHandler`.

## Forms

All forms use react-hook-form with a zod resolver. Schemas live in `features/*/schemas` (auth, post, comment, profile). Form components include `PostForm`, `ChangePasswordForm`, the comment forms and the profile editors (skills, experience, education, links, portfolio).

## API client and sessions

- `apiCall` returns a `{ success, data | message }` result and attaches the in-memory access token as a Bearer header.
- On a 401 it calls `POST /auth/refresh` (with cookies) once, with a single shared in-flight promise, then retries the request. Login, signup and refresh calls are excluded from the retry.
- If refresh fails, a `session-expired` event is dispatched and `SessionExpiryHandler` clears the session.

## TanStack Query patterns

- Defaults (`QueryProvider`): `retry: 2`, `staleTime: 10000`, `refetchOnWindowFocus: false`.
- Query-key factories per feature (for example `postQueryKey(id)`, `feedQueryKey(sort)`, `commentsQueryKey(postId)`).
- Live data through polling: feed, search, post detail and comments every 8 s, reactions list every 6 s, latest-post peek every 15 s.
- Mutations invalidate related keys (creating a comment invalidates its comments and the post). Reaction mutations cancel in-flight queries first, then invalidate the reaction, post and comment keys.

## Testing

```powershell
npm test
```

Vitest with jsdom and Testing Library (`src/test/setup.ts`, `src/test/utils.tsx`). Covered: auth, post, profile schemas; feed constants; search term and untrusted-text utils; profile transform and validators; HTTP client refresh logic; post mutations; `PostForm`, `PostSummarizer`, `ChangePasswordForm`, `ReactionButton`; login and signup pages. `NEXT_PUBLIC_API_URL` is set to `http://api.test` in `vitest.config.mts`.

## Docker

`next.config.ts` uses `output: "standalone"`. The `Dockerfile` is multi-stage (Node 22 Alpine, non-root, tini). `NEXT_PUBLIC_API_URL` is a build argument because Next.js inlines it at build time.

```powershell
cd frontend
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:5000 -t devcommunity-frontend:1.0.0 .
docker run --rm -p 3000:3000 devcommunity-frontend:1.0.0
```

Normally use `docker compose up --build` from the repository root, which builds both services.

## Responsive and loading states

Feed uses `PostCardSkeleton` placeholders while loading; pages show error and retry states (for example `/status`). Check feed, post detail and profile at phone width before the demo.