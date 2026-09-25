import type { ReactionMeta, ReactionType } from './types';
export const REACTIONS: ReactionMeta[] = [
  { type: 'like', label: 'Like', emoji: '👍', textClass: 'text-blue-600' },
  { type: 'love', label: 'Love', emoji: '❤️', textClass: 'text-red-600' },
  { type: 'care', label: 'Care', emoji: '🥰', textClass: 'text-amber-600' },
  { type: 'haha', label: 'Haha', emoji: '😆', textClass: 'text-amber-600' },
  { type: 'wow', label: 'Wow', emoji: '😮', textClass: 'text-amber-600' },
  { type: 'sad', label: 'Sad', emoji: '😢', textClass: 'text-amber-600' },
  { type: 'angry', label: 'Angry', emoji: '😡', textClass: 'text-orange-600' },
];
export const REACTION_TYPES: ReactionType[] = REACTIONS.map((reaction) => reaction.type);
export const REACTION_META = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.type, reaction])
) as Record<ReactionType, ReactionMeta>;