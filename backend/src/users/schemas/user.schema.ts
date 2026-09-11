import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true }) email: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ default: 'user', enum: ['user', 'admin'] }) role: string;
  @Prop({ default: [] }) skills: string[];
  @Prop({ default: [] }) experiences: Record<string, any>[];
}
export const UserSchema = SchemaFactory.createForClass(User);