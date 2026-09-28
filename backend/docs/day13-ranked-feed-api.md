# Day 13 — Ranked and Latest Feed APIs

## Ranking formula
engagement = likeCount * 1 + commentCount * 2
rankScore = log10(max(engagement, 0) + 1) - (ageInHours / 36)

- log10 gives strongly diminishing returns per like/comment, so one viral post can't permanently bury everything else.
- age (in hours) divided by GRAVITY_HOURS (36) is subtracted, so score decays linearly with time. Old posts naturally go negative — expected and handled everywhere rankScore is used.
- Comments are weighted 2x a like, since a comment is a bigger investment than a reaction.

## Sort options — `GET /posts?sort=...`
- `latest` (default): createdAt desc, then _id desc.
- `ranked`: rankScore desc, then createdAt desc, then _id desc.
- `discussed`: commentCount desc, then createdAt desc, then _id desc.

`GET /posts/admin/deleted` also now sorts with a `_id desc` secondary key for the same stability guarantee.

## Tie-breaking / pagination stability
`_id` is a MongoDB ObjectId, which is unique and monotonically increasing at creation time. Using it as the final sort key guarantees a strict total order for every sort mode, so two posts can never truly tie in the sort — pagination pages never shift or duplicate/skip rows even when scores, comment counts, or timestamps collide exactly.

## Edge cases handled
- Equal rankScore / equal createdAt: resolved deterministically by `_id`.
- Negative rankScore: old posts decay below zero; sorting still works correctly since it's a plain numeric sort.
- Zero engagement: log10(1) = 0, so score = -ageInHours/36 (a small negative number for anything not brand new).
- Empty result set: pagination meta returns `totalItems: 0`, `totalPages: 0`, `hasNextPage`/`hasPrevPage: false`, `items: []`.
- Soft-deleted posts (`deletedAt != null`) are excluded from all three sort modes.

## Implementation
- `src/posts/ranking.ts` — `calculateRankScore()` is a pure, unit-tested function (`ranking.spec.ts`) that is the single source of truth for the formula.
- `ranked` sort runs entirely in MongoDB via an aggregation pipeline (`buildRankScoreAggregationStage()` in the same file) using `$addFields` + `$facet`, so scoring/pagination/count all happen in one round trip without loading every post into app memory. The Mongo expression is mathematically equivalent to `calculateRankScore()` and is structurally tested against `RANKING_CONFIG`.
- `latest` and `discussed` don't need a computed field, so they stay as simple `.find().sort()` queries.

## Seed data
`backend/seed-day13-ranking.js` inserts a controlled, tagged (`seedTag: 'day13-ranking-seed'`) dataset under one fixed author:
- High engagement, fresh → should rank #1 on `sort=ranked`.
- Zero engagement, fresh → near-zero score, should be #1/#2 on `sort=latest`.
- Old but engaged → should have a **negative** rankScore.
- Tie A / Tie B → identical likeCount, commentCount, createdAt → verifies stable tie-break by `_id`.
- Most discussed outlier → low likes, huge comments → should be #1 on `sort=discussed`, not `sort=ranked`.
- Soft-deleted post → must never appear in any of the three sorts.

Run: `node seed-day13-ranking.js` (after `.env` is set up, same as the other seed scripts).

## Endpoints
`GET /posts?sort=latest|ranked|discussed&page=&limit=&authorId=` — response shape unchanged (`{ items, pagination }`), `sort` defaults to `latest`, fully backward compatible with existing frontend calls.