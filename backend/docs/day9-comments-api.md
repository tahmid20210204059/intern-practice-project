# Day 9 — Threaded Comments API

## Schema
Comment: postId, authorId, parentCommentId (null for top-level), body, depth, createdAt, updatedAt.

## Max reply depth
depth 0 = top-level comment. Each reply = parent.depth + 1.
MAX_COMMENT_DEPTH = 3, so allowed depths are 0, 1, 2, 3. Depth 4 is rejected with 400.

## Parent/post consistency
A reply's postId must equal its parent comment's postId, otherwise 400.

## Delete behavior — Cascade delete
Deleting a comment permanently deletes that comment and all of its descendant replies
(all levels below it), not just one level. Post.commentCount is decremented by the
total number of comments actually removed.

## Permissions
- Create: any authenticated user.
- Edit (PATCH): only the comment's author.
- Delete: the comment's author OR an admin.

## commentCount
Incremented by 1 on create via atomic `$inc`.
Decremented by the exact deleted count (1 + descendants) on delete via atomic `$inc`.

## Endpoints
- POST /comments { postId, parentCommentId?, body }
- GET /comments/post/:postId -> nested tree, oldest first
- PATCH /comments/:id { body }
- DELETE /comments/:id