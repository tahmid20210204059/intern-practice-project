import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const portfolioProjectSchema = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    urls: {
      type: 'object',
      properties: {
        live: { type: 'string' },
        github: { type: 'string' },
      },
    },
    technologies: { type: 'array', items: { type: 'string' } },
    from: { type: 'string', example: '2024-01' },
    to: { type: 'string', example: '2024-06' },
    isCurrent: { type: 'boolean' },
  },
};

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get('me')
  @ApiOkResponse({
    description: "Returns the authenticated user's developer profile.",
  })
  @ApiUnauthorizedResponse({
    schema: {
      example: { success: false, statusCode: 401, message: 'Unauthorized', errors: [] },
    },
  })
  getMyProfile(@Req() req: any) {
    return this.profileService.getOwnProfile(req.user.userId);
  }

  @Patch('me')
  @ApiBody({
    schema: {
      properties: {
        headline: { type: 'string' },
        bio: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        portfolioProjects: { type: 'array', items: portfolioProjectSchema },
      },
    },
  })
  @ApiOkResponse({
    description: "Updates the authenticated user's own developer profile fields.",
  })
  @ApiBadRequestResponse({
    schema: {
      example: {
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errors: ['Project title is required'],
      },
    },
  })
  @ApiUnauthorizedResponse({
    schema: {
      example: { success: false, statusCode: 401, message: 'Unauthorized', errors: [] },
    },
  })
  updateMyProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.profileService.updateOwnProfile(req.user.userId, body);
  }
}