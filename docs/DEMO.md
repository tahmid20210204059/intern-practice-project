# Day 20 Demo Plan (15 minutes)

## Before the demo

- [ ] `docker compose up --build` is running; `http://localhost:5000/health/ready` returns ok
- [ ] Admin seeded (`docker compose exec backend node seed-admin.cjs`)
- [ ] Two user accounts ready (User A, User B) plus the admin
- [ ] Swagger open at `http://localhost:5000/api-docs`
- [ ] `npm test` passes in `backend/` and `frontend/`
- [ ] Browser DevTools device mode ready for the responsive check

## Agenda

| Min | Segment | What to show |
|---|---|---|
| 0-1 | Intro | Stack, repo layout, README quick start |
| 1-3 | Auth | Sign up User A, log in; show refresh cookie (httpOnly, path `/auth`) in DevTools |
| 3-6 | Posts | Create a post (with image), feed tabs Top / Latest / Most Discussed, search |
| 6-9 | Community | User B comments and replies (threading), reacts; User A sees notifications |
| 9-10 | Summarizer | Click Summarize on a post: summary + tags |
| 10-12 | Permissions | User B tries to edit User A's post (403). Admin deletes and restores a post; show admin dashboard |
| 12-13 | Failure scenario | See below |
| 13-14 | Technical decisions | One frontend, one backend |
| 14-15 | Limitations and Q&A | Known limitations, next improvements |

## Failure scenario (pick one)

Option 1: summarizer outage with graceful error
1. Set `SUMMARIZER_MOCK_FAILURE=unavailable` in `backend/.env` (leave `GROQ_API_KEY` empty), then `docker compose up -d --force-recreate backend`.
2. Click Summarize. The UI shows the "summarizer is currently unavailable" message; the rest of the page keeps working.
3. Remove the variable and recreate to show recovery.
Other values: `timeout`, `malformed`.

Option 2: rate limit
Click Summarize more than 5 times in a minute. The API returns 429 with the message that the summarizer is limited to 5 requests per minute.

Option 3: permission failure
As User B call `PATCH /posts/{User A post id}` in Swagger. Expect 403 `You do not have permission to perform this action on this post`.

## Technical decisions to explain

Frontend: access token kept in memory with a single-flight refresh and retry in `src/lib/http/client.ts`. This avoids storing the token in `localStorage` (XSS exposure) and prevents several parallel requests from each triggering a refresh. Trade-off: a page reload needs one refresh call.

Backend: refresh token rotation with hashed storage. The refresh token is an httpOnly cookie scoped to `/auth`, and only its sha256 hash is stored, so a database leak does not expose usable tokens. Each refresh issues a new token and invalidates the old one. Trade-off: one active session per user record.

Alternative backend decision: reaction toggle runs in a MongoDB transaction so the reaction document and the like/reaction counter cannot drift apart; this is why a replica set (Atlas) is required.

## Known limitations

See "Known limitations" and "Realistic next improvements" in the root README.

## Mentor sign-off and release

After approval:

```powershell
git checkout main
git pull
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```