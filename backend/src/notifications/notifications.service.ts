import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<Notification>) {}

  create(userId: string | Types.ObjectId, message: string) {
    return this.notificationModel.create({ user: userId, message });
  }

  findAllForUser(userId: string) {
    return this.notificationModel.find({ user: userId }).sort({ createdAt: -1 });
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