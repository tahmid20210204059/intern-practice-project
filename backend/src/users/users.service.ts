import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }
  findById(id: string) {
    return this.userModel.findById(id).select('-passwordHash');
  }
  create(data: Partial<User>) {
    return this.userModel.create(data);
  }
  findAll() {
    return this.userModel.find().select('-passwordHash');
  }

  async updateRole(id: string, role: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const currentUser = await this.userModel.findById(id);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (role === 'admin' && currentUser.role !== 'admin') {
      const adminCount = await this.userModel.countDocuments({ role: 'admin' });
      if (adminCount >= 2) {
        throw new BadRequestException('Maximum of 2 admins allowed');
      }
    }

    if (role === 'user' && currentUser.role === 'admin') {
      const adminCount = await this.userModel.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last remaining admin');
      }
    }

    return this.userModel.findByIdAndUpdate(
      id,
      { role },
      { new: true },
    ).select('-passwordHash');
  }

  updateOwnProfile(id: string, data: Partial<User>) {
    const { name, skills, experiences } = data as any;
    return this.userModel.findByIdAndUpdate(
      id,
      { name, skills, experiences },
      { new: true, runValidators: true },
    ).select('-passwordHash');
  }

  deleteOwnAccount(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }
}