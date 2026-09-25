import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReactionsService } from './reactions.service.js';
import { CreateReactionDto } from './dto/create-reaction.dto.js';
import { GetMyReactionDto } from './dto/get-my-reaction.dto.js';
import { ReactionTargetType } from './schemas/reaction.schema.js';

@ApiTags('Reactions')
@ApiBearerAuth()
@Controller('reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(private reactionsService: ReactionsService) {}

  @Post()
  @ApiBody({ type: CreateReactionDto })
  @ApiOkResponse({ schema: { example: { success: true, data: { action: 'added', type: 'like' } } } })
  react(@Req() req: any, @Body() body: CreateReactionDto) {
    return this.reactionsService.react(req.user.userId, body);
  }

  @Get('me')
  @ApiQuery({ name: 'targetType', enum: ReactionTargetType })
  @ApiQuery({ name: 'targetId', type: String })
  @ApiOkResponse({ schema: { example: { success: true, data: 'like' } } })
  getMyReaction(@Req() req: any, @Query() query: GetMyReactionDto) {
    return this.reactionsService.getMyReaction(req.user.userId, query.targetType, query.targetId);
  }

  @Get()
  @ApiQuery({ name: 'targetType', enum: ReactionTargetType })
  @ApiQuery({ name: 'targetId', type: String })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [{ type: 'like', createdAt: '2024-01-01T00:00:00.000Z', user: { _id: '65f...', name: 'Jane', avatarUrl: '' } }],
      },
    },
  })
  listReactions(@Query() query: GetMyReactionDto) {
    return this.reactionsService.listForTarget(query.targetType, query.targetId);
  }
}