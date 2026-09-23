import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema.js';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<Notification>) {}

  create(
    userId: string | Types.ObjectId,
    message: string,
    postId?: string | Types.ObjectId,
    actorId?: string | Types.ObjectId,
  ) {
    return this.notificationModel.create({
      user: userId,
      message,
      postId: postId ?? null,
      actorId: actorId ?? null,
    });
  }

  findAllForUser(userId: string) {
    return this.notificationModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('actorId', 'name avatarUrl');
  }

  countUnread(userId: string) {
    return this.notificationModel.countDocuments({ user: userId, read: false });
  }

  async markRead(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid notification ID');
    const notification = await this.notificationModel.findOne({ _id: id, user: userId });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.read = true;
    await notification.save();
    return notification;
  }

  markAllRead(userId: string) {
    return this.notificationModel.updateMany({ user: userId, read: false }, { $set: { read: true } });
  }
}