import { Controller, Get, Patch, Delete, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const experienceItemSchema = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' },
    company: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    description: { type: 'string' },
  },
};

const educationItemSchema = {
  type: 'object' as const,
  properties: {
    degree: { type: 'string' },
    institute: { type: 'string' },
    subject: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
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
  updateMyProfile(@Req() req: any, @Body() body: any) {
    return this.usersService.updateOwnProfile(req.user.userId, body);
  }

  @Patch('me/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { skills: { type: 'array', items: { type: 'string' } } } } })
  updateMySkills(@Req() req: any, @Body('skills') skills: string[]) {
    return this.usersService.updateSkills(req.user.userId, skills);
  }

  @Patch('me/experiences')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { experiences: { type: 'array', items: experienceItemSchema } } } })
  updateMyExperiences(@Req() req: any, @Body('experiences') experiences: any[]) {
    return this.usersService.updateExperiences(req.user.userId, experiences);
  }

  @Patch('me/education')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { education: { type: 'array', items: educationItemSchema } } } })
  updateMyEducation(@Req() req: any, @Body('education') education: any[]) {
    return this.usersService.updateEducation(req.user.userId, education);
  }

  @Patch('me/links')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { properties: { links: linksSchema } } })
  updateMyLinks(@Req() req: any, @Body('links') links: any) {
    return this.usersService.updateLinks(req.user.userId, links);
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
  changeMyPassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) {
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
  updateUserByAdmin(@Param('id') id: string, @Body() body: any) {
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