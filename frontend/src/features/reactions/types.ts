export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
export type ReactionTargetType = 'post' | 'comment';
export type ReactionAction = 'added' | 'removed' | 'switched';
export interface ReactionResult {
  action: ReactionAction;
  type: ReactionType | null;
}
export interface ReactPayload {
  targetType: ReactionTargetType;
  targetId: string;
  type: ReactionType;
}
export interface ReactionMeta {
  type: ReactionType;
  label: string;
  emoji: string;
  textClass: string;
}
export interface ReactorUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}
export interface ReactionListItem {
  _id: string;
  type: ReactionType;
  createdAt: string;
  user: ReactorUser | null;
}