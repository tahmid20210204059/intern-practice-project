import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) user: Types.ObjectId;
  @Prop({ required: true }) message: string;
  @Prop({ default: false }) read: boolean;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);