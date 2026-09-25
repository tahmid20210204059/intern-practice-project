import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';
import { REACTION_TYPES } from '../constants';
import type { ReactionListItem, ReactionTargetType, ReactionType } from '../types';

export const myReactionQueryKey = (targetType: ReactionTargetType, targetId: string) =>
  ['reactions', 'me', targetType, targetId] as const;

export const reactionsListQueryKey = (targetType: ReactionTargetType, targetId: string) =>
  ['reactions', 'list', targetType, targetId] as const;

export async function fetchMyReaction(targetType: ReactionTargetType, targetId: string): Promise<ReactionType | null> {
  const params = new URLSearchParams({ targetType, targetId });
  const res = await apiCall<unknown>(`/reactions/me?${params.toString()}`);
  if (!res.success) throw new Error(res.message || 'Failed to load reaction');
  const value = res.data;
  if (typeof value === 'string' && REACTION_TYPES.includes(value as ReactionType)) {
    return value as ReactionType;
  }
  return null;
}

export function useMyReaction(targetType: ReactionTargetType, targetId: string) {
  return useQuery({
    queryKey: myReactionQueryKey(targetType, targetId),
    queryFn: () => fetchMyReaction(targetType, targetId),
    enabled: !!targetId,
    staleTime: 30000,
  });
}

export async function fetchReactionsList(
  targetType: ReactionTargetType,
  targetId: string
): Promise<ReactionListItem[]> {
  const params = new URLSearchParams({ targetType, targetId });
  const res = await apiCall<ReactionListItem[]>(`/reactions?${params.toString()}`);
  if (!res.success) throw new Error(res.message || 'Failed to load reactions');
  return res.data;
}

export function useReactionsList(targetType: ReactionTargetType, targetId: string, enabled: boolean) {
  return useQuery({
    queryKey: reactionsListQueryKey(targetType, targetId),
    queryFn: () => fetchReactionsList(targetType, targetId),
    enabled: enabled && !!targetId,
    staleTime: 10000,
    refetchInterval: enabled ? 6000 : false,
  });
}