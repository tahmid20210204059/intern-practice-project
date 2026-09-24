import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReactionTargetType {
  POST = 'post',
  COMMENT = 'comment',
}

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  CARE = 'care',
  HAHA = 'haha',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
}

@Schema({ timestamps: true })
export class Reaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ReactionTargetType), required: true })
  targetType: ReactionTargetType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ReactionType), required: true })
  type: ReactionType;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);

ReactionSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
ReactionSchema.index({ targetType: 1, targetId: 1 });