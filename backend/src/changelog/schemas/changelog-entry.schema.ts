import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'changelog_entries' })
export class ChangelogEntry extends Document {
  @Prop({ required: true, lowercase: true, trim: true }) owner: string;
  @Prop({ required: true, lowercase: true, trim: true }) repo: string;
  @Prop({ required: true }) prNumber: number;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) authorLogin: string;
  @Prop({ type: Date, required: true }) mergedAt: Date;
  @Prop({ required: true }) htmlUrl: string;
  @Prop({ required: true, default: 'main' }) baseBranch: string;
  @Prop({ type: Date, required: true }) syncedAt: Date;
  @Prop({ required: true, enum: ['github', 'mock'] }) source: string;
}
export const ChangelogEntrySchema = SchemaFactory.createForClass(ChangelogEntry);
ChangelogEntrySchema.index({ source: 1, owner: 1, repo: 1, prNumber: 1 }, { unique: true });
ChangelogEntrySchema.index({ source: 1, mergedAt: -1 });
