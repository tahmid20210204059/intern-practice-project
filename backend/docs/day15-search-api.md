# Day 15 — Full-text Search

## Index
Post has a MongoDB text index `post_text_search` on `title` (weight 5) and `body` (weight 1).

## Endpoint
`GET /posts/search?q=term&page=1&limit=10`
- q: required, trimmed, max 100 characters, whitespace collapsed
- page: 1-100, default 1
- limit: 1-50, default 10
- Auth: JWT required. Rate limit: 30 requests per 10 seconds per user.

## Query handling
- Everything except letters, combining marks, numbers and spaces is replaced with a space, so quotes, `-` negation and operators cannot change the search semantics.
- At most 10 terms are used.
- Query runs with maxTimeMS 5000.
- Soft-deleted posts are excluded.
- Sort: textScore desc, createdAt desc, _id desc.

## Responses
- Success: `{ items, pagination, query }`
- Valid term with no matches, or a term with only symbols: `{ items: [], pagination: { totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false, ... }, query }`
- Missing, blank, too long or malformed q: 400 `Validation failed`
- Rate limit exceeded: 429