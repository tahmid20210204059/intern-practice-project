# Day 11 — Reaction Engine

## Schema
Reaction: userId, targetType (post|comment), targetId, type (like|love|care|haha|wow|sad|angry).
Compound unique index on (userId, targetType, targetId) — one reaction per user per target.

## Toggle behavior
- No existing reaction -> create, count +1.
- Same type sent again -> delete, count -1.
- Different type sent -> update type in place, count unchanged.

## Counts
Post reuses the existing `likeCount` field as the total reaction count.
Comment gets a new `reactionCount` field.
Both are updated with atomic `$inc` inside the same MongoDB transaction as the
reaction write, so counts and reaction rows can never drift apart.

## Concurrency
Two concurrent requests from the same user on the same target can both pass
the "does a reaction exist" check before either commits. The unique index
then rejects the second insert; the service retries (up to 3 times) and
resolves against the row the other request just wrote.

## Permissions
Any authenticated user may react. Reacting to a missing, invalid, or
soft-deleted post, or a missing comment, is rejected with 404/400.

## Endpoints
- POST /reactions { targetType, targetId, type } -> { action, type }
- GET /reactions/me?targetType=post&targetId=... -> current user's reaction type or null