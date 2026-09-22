import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @ApiBody({ type: CreateCommentDto })
  create(@Req() req: any, @Body() body: CreateCommentDto) {
    return this.commentsService.create(req.user.userId, body);
  }

  @Get('post/:postId')
  findByPost(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateCommentDto })
  update(@Param('id') id: string, @Req() req: any, @Body() body: UpdateCommentDto) {
    return this.commentsService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.commentsService.remove(id, req.user.userId, req.user.role);
  }
}