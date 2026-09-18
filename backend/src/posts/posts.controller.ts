import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { QueryPostsDto } from './dto/query-posts.dto.js';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  @ApiBody({ type: CreatePostDto })
  create(@Req() req: any, @Body() body: CreatePostDto) {
    return this.postsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Query() query: QueryPostsDto) {
    return this.postsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdatePostDto })
  update(@Param('id') id: string, @Req() req: any, @Body() body: UpdatePostDto) {
    return this.postsService.update(id, req.user.userId, req.user.role, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.postsService.remove(id, req.user.userId, req.user.role);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @Req() req: any) {
    return this.postsService.restore(id, req.user.userId, req.user.role);
  }
}