import type { ReactionMeta, ReactionType } from './types';
export const REACTIONS: ReactionMeta[] = [
  { type: 'like', label: 'Like', emoji: '👍', textClass: 'text-brand' },
  { type: 'love', label: 'Love', emoji: '❤️', textClass: 'text-brand' },
  { type: 'care', label: 'Care', emoji: '🥰', textClass: 'text-brand' },
  { type: 'haha', label: 'Haha', emoji: '😆', textClass: 'text-brand' },
  { type: 'wow', label: 'Wow', emoji: '😮', textClass: 'text-brand' },
  { type: 'sad', label: 'Sad', emoji: '😢', textClass: 'text-brand' },
  { type: 'angry', label: 'Angry', emoji: '😡', textClass: 'text-brand' },
];
export const REACTION_TYPES: ReactionType[] = REACTIONS.map((reaction) => reaction.type);
export const REACTION_META = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.type, reaction])
) as Record<ReactionType, ReactionMeta>;