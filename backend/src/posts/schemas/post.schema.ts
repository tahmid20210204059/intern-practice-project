import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;
  @Prop({ required: true, trim: true, maxlength: 150 })
  title: string;
  @Prop({ required: true, maxlength: 5000 })
  body: string;
  @Prop({ default: '' })
  imageUrl: string;
  @Prop({ default: 0 })
  likeCount: number;
  @Prop({ default: 0 })
  commentCount: number;
  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}
export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ deletedAt: 1, createdAt: -1 });
PostSchema.index({ title: 'text', body: 'text' }, { name: 'post_text_search', weights: { title: 5, body: 1 } });