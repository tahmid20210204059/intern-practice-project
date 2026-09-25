import { useCallback } from 'react';
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type Query,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';
import type { FeedPage, Post } from '@/features/posts/types';
import type { Comment } from '@/features/comments/types';
import { isPostListQuery, postQueryKey } from '@/features/posts/queries/posts';
import { commentsQueryKey } from '@/features/comments/queries/comments';
import { myReactionQueryKey, reactionsListQueryKey } from '../queries/reactions';
import type { ReactionResult, ReactionTargetType, ReactionType, ReactPayload } from '../types';
export const REACTION_MUTATION_KEY = ['reactions', 'react'] as const;
const REQUEST_TIMEOUT_MS = 15000;
const inFlight = new Set<string>();
interface ReactionTarget {
  targetType: ReactionTargetType;
  targetId: string;
  postId?: string;
}
interface ReactionSnapshot {
  myReaction: ReactionType | null;
  detailCount: number | undefined;
  listCounts: Array<[QueryKey, number | undefined]>;
  commentCount: number | undefined;
}
const isPostDetailQuery = (query: Query) => query.queryKey[0] === 'posts' && query.queryKey[1] === 'detail';
export async function reactRequest(payload: ReactPayload): Promise<ReactionResult> {
  const res = await apiCall<ReactionResult>('/reactions', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.success) throw new Error(res.message || 'Failed to update reaction');
  return res.data;
}
function resolveReaction(previous: ReactionType | null, clicked: ReactionType): { next: ReactionType | null; delta: number } {
  if (previous === null) return { next: clicked, delta: 1 };
  if (previous === clicked) return { next: null, delta: -1 };
  return { next: clicked, delta: 0 };
}
function findPost(data: InfiniteData<FeedPage> | undefined, id: string): Post | undefined {
  if (!data) return undefined;
  for (const page of data.pages) {
    const found = page.items.find((post) => post._id === id);
    if (found) return found;
  }
  return undefined;
}
function mapPost(
  data: InfiniteData<FeedPage> | undefined,
  id: string,
  fn: (post: Post) => Post
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((post) => (post._id === id ? fn(post) : post)),
    })),
  };
}
function findComment(nodes: Comment[] | undefined, id: string): Comment | undefined {
  if (!nodes) return undefined;
  for (const node of nodes) {
    if (node._id === id) return node;
    const found = findComment(node.replies, id);
    if (found) return found;
  }
  return undefined;
}
function mapComments(nodes: Comment[], id: string, fn: (comment: Comment) => Comment): Comment[] {
  return nodes.map((node) =>
    node._id === id ? fn(node) : { ...node, replies: mapComments(node.replies || [], id, fn) }
  );
}
function takeSnapshot(qc: QueryClient, target: ReactionTarget, myReaction: ReactionType | null): ReactionSnapshot {
  if (target.targetType === 'post') {
    return {
      myReaction,
      detailCount: qc.getQueryData<Post>(postQueryKey(target.targetId))?.likeCount,
      listCounts: qc
        .getQueriesData<InfiniteData<FeedPage>>({ predicate: isPostListQuery })
        .map(([key, data]) => [key, findPost(data, target.targetId)?.likeCount] as [QueryKey, number | undefined]),
      commentCount: undefined,
    };
  }
  const comment = findComment(qc.getQueryData<Comment[]>(commentsQueryKey(target.postId ?? '')), target.targetId);
  return {
    myReaction,
    detailCount: undefined,
    listCounts: [],
    commentCount: comment ? (comment.reactionCount ?? 0) : undefined,
  };
}
function shiftCount(qc: QueryClient, target: ReactionTarget, delta: number) {
  if (delta === 0) return;
  if (target.targetType === 'post') {
    qc.setQueryData<Post>(postQueryKey(target.targetId), (old) =>
      old ? { ...old, likeCount: Math.max(0, old.likeCount + delta) } : old
    );
    qc.setQueriesData<InfiniteData<FeedPage>>({ predicate: isPostListQuery }, (old) =>
      mapPost(old, target.targetId, (post) => ({ ...post, likeCount: Math.max(0, post.likeCount + delta) }))
    );
    return;
  }
  qc.setQueryData<Comment[]>(commentsQueryKey(target.postId ?? ''), (old) =>
    old
      ? mapComments(old, target.targetId, (comment) => ({
          ...comment,
          reactionCount: Math.max(0, (comment.reactionCount ?? 0) + delta),
        }))
      : old
  );
}
function restoreCounts(qc: QueryClient, target: ReactionTarget, snapshot: ReactionSnapshot) {
  if (target.targetType === 'post') {
    const detailCount = snapshot.detailCount;
    if (detailCount !== undefined) {
      qc.setQueryData<Post>(postQueryKey(target.targetId), (old) => (old ? { ...old, likeCount: detailCount } : old));
    }
    for (const [key, count] of snapshot.listCounts) {
      if (count === undefined) continue;
      qc.setQueryData<InfiniteData<FeedPage>>(key, (old) =>
        mapPost(old, target.targetId, (post) => ({ ...post, likeCount: count }))
      );
    }
    return;
  }
  const commentCount = snapshot.commentCount;
  if (commentCount === undefined) return;
  qc.setQueryData<Comment[]>(commentsQueryKey(target.postId ?? ''), (old) =>
    old ? mapComments(old, target.targetId, (comment) => ({ ...comment, reactionCount: commentCount })) : old
  );
}
async function cancelScope(qc: QueryClient, target: ReactionTarget) {
  const tasks: Promise<void>[] = [
    qc.cancelQueries({ queryKey: myReactionQueryKey(target.targetType, target.targetId) }),
  ];
  if (target.targetType === 'post') {
    tasks.push(qc.cancelQueries({ queryKey: postQueryKey(target.targetId) }));
    tasks.push(qc.cancelQueries({ predicate: isPostListQuery }));
  } else {
    tasks.push(qc.cancelQueries({ queryKey: commentsQueryKey(target.postId ?? '') }));
  }
  await Promise.all(tasks);
}
function reconcile(qc: QueryClient, target: ReactionTarget, scopeKey: readonly unknown[]) {
  qc.invalidateQueries({ queryKey: myReactionQueryKey(target.targetType, target.targetId) });
  qc.invalidateQueries({ queryKey: reactionsListQueryKey(target.targetType, target.targetId) });
  if (qc.isMutating({ mutationKey: scopeKey }) > 1) return;
  if (target.targetType === 'post') {
    qc.invalidateQueries({ predicate: isPostListQuery });
    qc.invalidateQueries({ predicate: isPostDetailQuery });
    return;
  }
  qc.invalidateQueries({ queryKey: commentsQueryKey(target.postId ?? '') });
}
export function useReaction(target: ReactionTarget) {
  const qc = useQueryClient();
  const { targetType, targetId, postId } = target;
  const lock = `${targetType}:${targetId}`;
  const scopeKey =
    targetType === 'post'
      ? [...REACTION_MUTATION_KEY, 'post']
      : [...REACTION_MUTATION_KEY, 'comment', postId ?? ''];
  const mutation = useMutation<ReactionResult, Error, ReactionType, ReactionSnapshot>({
    mutationKey: scopeKey,
    mutationFn: (type) => reactRequest({ targetType, targetId, type }),
    onMutate: async (type) => {
      await cancelScope(qc, { targetType, targetId, postId });
      const myKey = myReactionQueryKey(targetType, targetId);
      const myReaction = qc.getQueryData<ReactionType | null>(myKey) ?? null;
      const snapshot = takeSnapshot(qc, { targetType, targetId, postId }, myReaction);
      const { next, delta } = resolveReaction(myReaction, type);
      qc.setQueryData<ReactionType | null>(myKey, next);
      shiftCount(qc, { targetType, targetId, postId }, delta);
      return snapshot;
    },
    onError: (_error, _type, snapshot) => {
      if (!snapshot) return;
      qc.setQueryData<ReactionType | null>(myReactionQueryKey(targetType, targetId), snapshot.myReaction);
      restoreCounts(qc, { targetType, targetId, postId }, snapshot);
    },
    onSuccess: (result) => {
      qc.setQueryData<ReactionType | null>(myReactionQueryKey(targetType, targetId), result.type);
    },
    onSettled: () => {
      inFlight.delete(lock);
      reconcile(qc, { targetType, targetId, postId }, scopeKey);
    },
  });
  const { mutate } = mutation;
  const react = useCallback(
    (type: ReactionType) => {
      if (inFlight.has(lock)) return;
      inFlight.add(lock);
      mutate(type);
    },
    [lock, mutate]
  );
  return {
    react,
    isPending: mutation.isPending,
    errorMessage: mutation.isError ? mutation.error.message || 'Could not update reaction.' : '',
    reset: mutation.reset,
  };
}