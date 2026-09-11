import { Controller, Get, Patch, Delete, Param, Body, Req, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Req() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'New Name' },
        skills: { type: 'array', items: { type: 'string' }, example: ['NestJS', 'React'] },
        experiences: {
          type: 'array',
          items: { type: 'object' },
          example: [{ title: 'Developer', company: 'ABC', from: '2023', to: '2024', description: '...' }],
        },
      },
    },
  })
  async updateMyProfile(@Req() req: any, @Body() body: any) {
    const updated = await this.usersService.updateOwnProfile(req.user.userId, body);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMyAccount(@Req() req: any) {
    const deleted = await this.usersService.deleteOwnAccount(req.user.userId);
    if (!deleted) throw new NotFoundException('User not found');
    return { message: 'Account deleted successfully' };
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBody({
    schema: {
      properties: {
        role: { type: 'string', example: 'admin', enum: ['user', 'admin'] },
      },
    },
  })
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    if (!['user', 'admin'].includes(role)) {
      throw new BadRequestException('Role must be either "user" or "admin"');
    }
    const updated = await this.usersService.updateRole(id, role);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }
}