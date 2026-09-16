import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Fields that must never be returned from the profile endpoints.
const PRIVATE_FIELD_SELECTOR = '-passwordHash -refreshTokenHash -refreshTokenExpiresAt';

@Injectable()
export class ProfileService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getOwnProfile(userId: string) {
    const user = await this.userModel.findById(userId).select(PRIVATE_FIELD_SELECTOR);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateOwnProfile(userId: string, data: UpdateProfileDto) {
    const update: Record<string, unknown> = {};

    if (data.headline !== undefined) {
      update.headline = data.headline.trim();
    }

    if (data.bio !== undefined) {
      update.bio = data.bio;
    }

    if (data.skills !== undefined) {
      update.skills = data.skills.map((skill) => skill.trim()).filter(Boolean);
    }

    if (data.portfolioProjects !== undefined) {
      update.portfolioProjects = data.portfolioProjects.map((project) => ({
        title: project.title.trim(),
        description: project.description?.trim() || '',
        urls: {
          live: project.urls?.live?.trim() || '',
          github: project.urls?.github?.trim() || '',
        },
        technologies: (project.technologies ?? [])
          .map((tech) => tech.trim())
          .filter(Boolean),
        from: project.from,
        to: project.isCurrent ? '' : (project.to ?? ''),
        isCurrent: !!project.isCurrent,
      }));
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, update, { new: true, runValidators: true })
      .select(PRIVATE_FIELD_SELECTOR);

    if (!updatedUser) throw new NotFoundException('User not found');
    return updatedUser;
  }
}