import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { getPasswordError, ALLOWED_LINK_KEYS } from '../common/validators.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationsService: NotificationsService,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  findByRefreshTokenHash(hash: string) {
    return this.userModel.findOne({ refreshTokenHash: hash });
  }

  setRefreshToken(id: string, hash: string, expiresAt: Date) {
    return this.userModel.findByIdAndUpdate(id, { refreshTokenHash: hash, refreshTokenExpiresAt: expiresAt });
  }

  clearRefreshToken(id: string) {
    return this.userModel.findByIdAndUpdate(id, { refreshTokenHash: null, refreshTokenExpiresAt: null });
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID');
    const user = await this.userModel.findById(id).select('-passwordHash');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  findAll() {
    return this.userModel.find().select('-passwordHash');
  }

  async updateRole(id: string, role: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID');
    const currentUser = await this.userModel.findById(id);
    if (!currentUser) throw new NotFoundException('User not found');

    if (role === 'admin' && currentUser.role !== 'admin') {
      const adminCount = await this.userModel.countDocuments({ role: 'admin' });
      if (adminCount >= 2) throw new BadRequestException('Maximum of 2 admins allowed');
    }
    if (role === 'user' && currentUser.role === 'admin') {
      const adminCount = await this.userModel.countDocuments({ role: 'admin' });
      if (adminCount <= 1) throw new BadRequestException('Cannot demote the last remaining admin');
    }

    return this.userModel.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
  }

  private buildProfileUpdate(data: { name?: string; headline?: string; bio?: string; avatarUrl?: string }) {
    const update: Record<string, any> = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new BadRequestException('Name cannot be empty');
      update.name = data.name.trim();
    }

    if (data.headline !== undefined) {
      update.headline = data.headline.trim();
    }

    if (data.bio !== undefined) {
      if (data.bio.length > 300) throw new BadRequestException('Bio must be 300 characters or fewer');
      update.bio = data.bio;
    }

    if (data.avatarUrl !== undefined) {
      if (data.avatarUrl) {
        if (!data.avatarUrl.startsWith('data:image/')) {
          throw new BadRequestException('Avatar must be a valid image');
        }
        const base64Part = data.avatarUrl.split(',')[1] || '';
        const sizeInBytes = Math.ceil((base64Part.length * 3) / 4);
        if (sizeInBytes > 2 * 1024 * 1024) {
          throw new BadRequestException('Avatar image must be smaller than 2MB');
        }
      }
      update.avatarUrl = data.avatarUrl;
    }

    return update;
  }

  async updateOwnProfile(id: string, data: { name?: string; headline?: string; bio?: string; avatarUrl?: string }) {
    const update = this.buildProfileUpdate(data);
    return this.userModel.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-passwordHash');
  }

  async updateSkills(id: string, skills: string[]) {
    return this.userModel.findByIdAndUpdate(id, { skills }, { new: true, runValidators: true }).select('-passwordHash');
  }

  async updateExperiences(id: string, experiences: any[]) {
    return this.userModel.findByIdAndUpdate(id, { experiences }, { new: true, runValidators: true }).select('-passwordHash');
  }

  async updateEducation(id: string, education: any[]) {
    return this.userModel.findByIdAndUpdate(id, { education }, { new: true, runValidators: true }).select('-passwordHash');
  }

  async updateLinks(id: string, links: any) {
    const sanitized: Record<string, string> = {};
    for (const key of ALLOWED_LINK_KEYS) {
      sanitized[key] = links?.[key] ? links[key].trim() : '';
    }
    return this.userModel.findByIdAndUpdate(id, { links: sanitized }, { new: true, runValidators: true }).select('-passwordHash');
  }

  deleteOwnAccount(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }

  async updateProfileByAdmin(id: string, data: any) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID');
    const currentUser = await this.userModel.findById(id);
    if (!currentUser) throw new NotFoundException('User not found');

    const update: Record<string, any> = this.buildProfileUpdate(data);
    const changedFields: string[] = [];

    if (update.name !== undefined && update.name !== currentUser.name) changedFields.push('Name');
    if (update.headline !== undefined && update.headline !== currentUser.headline) changedFields.push('Headline');
    if (update.bio !== undefined && update.bio !== currentUser.bio) changedFields.push('Bio');
    if (update.avatarUrl !== undefined && update.avatarUrl !== currentUser.avatarUrl) changedFields.push('Profile Photo');

    if (data.skills !== undefined) {
      if (JSON.stringify(data.skills) !== JSON.stringify(currentUser.skills)) {
        update.skills = data.skills;
        changedFields.push('Skills');
      }
    }

    if (data.experiences !== undefined) {
      if (JSON.stringify(data.experiences) !== JSON.stringify(currentUser.experiences)) {
        update.experiences = data.experiences;
        changedFields.push('Experience');
      }
    }

    if (data.education !== undefined) {
      if (JSON.stringify(data.education) !== JSON.stringify(currentUser.education)) {
        update.education = data.education;
        changedFields.push('Education');
      }
    }

    if (data.links !== undefined) {
      const sanitized: Record<string, string> = {};
      for (const key of ALLOWED_LINK_KEYS) {
        sanitized[key] = data.links[key] ? data.links[key].trim() : '';
      }
      if (JSON.stringify(sanitized) !== JSON.stringify(currentUser.links)) {
        update.links = sanitized;
        changedFields.push('Links');
      }
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select('-passwordHash');

    if (changedFields.length > 0) {
      await this.notificationsService.create(id, `Your profile was edited by an admin. Updated: ${changedFields.join(', ')}.`);
    }

    return updatedUser;
  }

  async deleteUserByAdmin(id: string, adminId: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID');
    if (id === adminId) throw new BadRequestException('Use your account settings to delete your own account');
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.userModel.findByIdAndDelete(id);
    return { message: 'User deleted successfully' };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string, confirmNewPassword: string) {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new BadRequestException('Current password, new password, and confirm password are all required');
    }
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }
    const passwordError = getPasswordError(newPassword);
    if (passwordError) {
      throw new BadRequestException(`New ${passwordError.toLowerCase()}`);
    }
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');
    const isSameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSameAsOld) throw new BadRequestException('New password must be different from your current password');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return { message: 'Password updated successfully' };
  }
}