import { Controller, Get, Patch, Delete, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateEducationDto } from './dto/update-education.dto.js';
import { UpdateExperiencesDto } from './dto/update-experiences.dto.js';
import { UpdateLinksDto } from './dto/update-links.dto.js';
import { UpdateSkillsDto } from './dto/update-skills.dto.js';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto.js';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto.js';

const experienceItemSchema = {
  type: 'object' as const,
  required: ['title', 'company', 'from'],
  properties: {
    title: { type: 'string', maxLength: 120 },
    company: { type: 'string', maxLength: 120 },
    from: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
    to: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$', nullable: true },
    description: { type: 'string', maxLength: 500 },
  },
};

const educationItemSchema = {
  type: 'object' as const,
  required: ['degree', 'institute', 'from'],
  properties: {
    degree: { type: 'string', maxLength: 120 },
    institute: { type: 'string', maxLength: 120 },
    subject: { type: 'string', maxLength: 120 },
    from: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
    to: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$', nullable: true },
  },
};

const linksSchema = {
  type: 'object' as const,
  properties: {
    portfolio: { type: 'string' },
    github: { type: 'string' },
    linkedin: { type: 'string' },
    facebook: { type: 'string' },
  },
};

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { name: { type: 'string' }, bio: { type: 'string' }, avatarUrl: { type: 'string' } } } })
  updateMyProfile(@Req() req: any, @Body() body: UpdateUserProfileDto) {
    return this.usersService.updateOwnProfile(req.user.userId, body);
  }

  @Patch('me/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { skills: { type: 'array', items: { type: 'string' } } } } })
  updateMySkills(@Req() req: any, @Body() body: UpdateSkillsDto) {
    return this.usersService.updateSkills(req.user.userId, body.skills);
  }

  @Patch('me/experiences')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { experiences: { type: 'array', items: experienceItemSchema } } } })
  updateMyExperiences(@Req() req: any, @Body() body: UpdateExperiencesDto) {
    return this.usersService.updateExperiences(req.user.userId, body.experiences);
  }

  @Patch('me/education')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { education: { type: 'array', items: educationItemSchema } } } })
  updateMyEducation(@Req() req: any, @Body() body: UpdateEducationDto) {
    return this.usersService.updateEducation(req.user.userId, body.education);
  }

  @Patch('me/links')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { links: linksSchema } } })
  updateMyLinks(@Req() req: any, @Body() body: UpdateLinksDto) {
    return this.usersService.updateLinks(req.user.userId, body.links);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    schema: {
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string' },
        confirmNewPassword: { type: 'string' },
      },
    },
  })
  changeMyPassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, body.currentPassword, body.newPassword, body.confirmNewPassword);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMyAccount(@Req() req: any) {
    await this.usersService.deleteOwnAccount(req.user.userId);
    return { message: 'Account deleted successfully' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getProfileById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string' },
        bio: { type: 'string' },
        avatarUrl: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        experiences: { type: 'array', items: experienceItemSchema },
        education: { type: 'array', items: educationItemSchema },
        links: linksSchema,
      },
    },
  })
  updateUserByAdmin(@Param('id') id: string, @Body() body: UpdateUserAdminDto) {
    return this.usersService.updateProfileByAdmin(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteUserByAdmin(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deleteUserByAdmin(id, req.user.userId);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBody({ schema: { properties: { role: { type: 'string', enum: ['user', 'admin'] } } } })
  updateRole(@Param('id') id: string, @Body('role') role: string) {
    if (!['user', 'admin'].includes(role)) throw new BadRequestException('Role must be "user" or "admin"');
    return this.usersService.updateRole(id, role);
  }
}