# Day 17 - Focused Automated Testing

## Run
- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`

## Test matrix

| Risk | Layer | File | What is asserted |
|---|---|---|---|
| Signup hashing, role forcing, token issue | BE unit | `src/auth/auth.service.spec.ts` | bcrypt hash stored, role `user`, JWT payload, refresh token stored only as sha256, duplicate email, weak passwords, refresh lifetime |
| Login, refresh rotation, logout | BE unit | `src/auth/auth.service.spec.ts` | same error for bad email/password, expired/unknown refresh rejected, rotation, logout clears |
| Role authorization | BE unit | `src/auth/auth-guards.spec.ts` | admin allowed, user/no user/no role denied, metadata lookup, JWT payload mapping |
| Post ownership/admin rules, retention | BE unit | `src/posts/posts.service.spec.ts` | non-owner forbidden, admin allowed, admin delete notifies, restore window, hard delete threshold |
| Feed sorting and pagination | BE unit | `src/posts/posts.service.spec.ts` | latest/discussed sort specs, soft-delete filter, ranked aggregation pipeline, pagination meta, search sanitization |
| Ranking | BE unit | `src/posts/ranking.order.spec.ts` (+ existing `ranking.spec.ts`) | ordering, tie-break, weights, diminishing returns, linear decay, DB expression parity |
| Comment permissions and cascade | BE unit | `src/comments/comments.service.spec.ts` | depth limit, notifications, author-only edit, delete matrix, cascade count |
| Reaction toggling | BE unit | `src/reactions/reactions.toggle.spec.ts` (+ existing `reactions.service.spec.ts`) | add/remove/switch counts for comments, failures, session cleanup, listing order |
| Auth + protected action end to end | BE integration | `test/auth-flow.integration.spec.ts` | signup, cookie, validation, 401/403, role claim stripping, protected create/delete, refresh rotation, logout |
| Zod schemas | FE unit | `features/*/schemas/*.test.ts` | auth, post, experience, education, portfolio rules |
| Validators/utilities | FE unit | `profile/utils/*.test.ts`, `posts/utils/*.test.ts`, `posts/constants.test.ts` | password, link hosts, transforms, untrusted text, search term, sort param |
| HTTP client and session refresh | FE unit | `lib/http/client.test.ts` | bearer header, single refresh on concurrent 401, retry once, session cleared on failure, network error, abort, upload |
| Login/Signup forms | FE component | `src/test/pages/*.test.tsx` | validation, disabled/pending, success session + redirect, server errors, password toggle |
| Change password form | FE component | `ChangePasswordForm.test.tsx` | validation order, pending, success reset, server error |
| Post form | FE component | `PostForm.test.tsx` | validation, trimming, submitting state, upload states |
| AI summarizer | FE component + unit | `PostSummarizer.test.tsx`, `mutations/posts.test.ts` | loading, success, retryable vs non-retryable errors, double click guard |
| Reaction interaction | FE integration | `ReactionButton.test.tsx` | optimistic increment/decrement, server confirm, rollback on error |

## Deliberate-break checks (each must turn a test red; revert afterwards)
1. `auth.service.ts` login: remove `if (!match) throw ...` -> `auth.service.spec.ts`, integration login test fail.
2. `roles.guard.ts`: return `true` -> `auth-guards.spec.ts`, integration 403 test fail.
3. `posts.service.ts` `assertOwnerOrAdmin`: remove the throw -> `posts.service.spec.ts` fails.
4. `comments.service.ts` `MAX_COMMENT_DEPTH`: change to 5 -> depth test fails.
5. `reactions.service.ts`: change `existing.type === dto.type` to `false` -> toggle tests fail.
6. `ranking.ts` `GRAVITY_HOURS`: change to 72 -> decay test fails.
7. `auth.service.ts` signup: store `password` instead of hash -> hashing test fails.
8. `frontend/src/lib/http/client.ts`: remove `!NO_REFRESH_PATHS.includes(path)` -> login 401 test fails.
9. `frontend/src/features/auth/schemas/auth.ts`: remove uppercase regex -> schema test fails.
10. `frontend/src/features/reactions/mutations/reactions.ts`: remove `onError` rollback -> rollback test fails.
