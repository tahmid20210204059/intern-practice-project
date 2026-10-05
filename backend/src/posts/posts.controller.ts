import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { QueryPostsDto, PostSortOption } from './dto/query-posts.dto.js';
import { SearchPostsDto } from './dto/search-posts.dto.js';
import { SearchRateLimitGuard } from './search-rate-limit.guard.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';

const rateLimitExample = { success: false, statusCode: 429, message: 'Too many requests. Please try again later.', errors: [] };

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}
  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'posts-create', limit: 20, windowMs: 60 * 1000, by: 'user', message: 'You are posting too fast. Please wait a moment.' })
  @ApiOperation({ summary: 'Create a post' })
  @ApiBody({ type: CreatePostDto })
  @ApiTooManyRequestsResponse({ description: '20 posts per minute per user', schema: { example: rateLimitExample } })
  create(@Req() req: any, @Body() body: CreatePostDto) {
    return this.postsService.create(req.user.userId, body);
  }
  @Get()
  @ApiOperation({ summary: 'List posts' })
  @ApiQuery({ name: 'sort', enum: PostSortOption, required: false, description: 'latest (default), ranked, or discussed' })
  findAll(@Query() query: QueryPostsDto) {
    return this.postsService.findAll(query);
  }
  @Get('search')
  @UseGuards(SearchRateLimitGuard)
  @ApiOperation({ summary: 'Full-text search', description: 'q is required, max 100 characters.' })
  @ApiTooManyRequestsResponse({ description: '30 searches per 10 seconds per user', schema: { example: rateLimitExample } })
  search(@Query() query: SearchPostsDto) {
    return this.postsService.search(query);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get one post' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }
  @Post(':id/summarize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'posts-summarize', limit: 5, windowMs: 60 * 1000, by: 'user', message: 'The summarizer is limited to 5 requests per minute. Please wait and try again.' })
  @ApiOperation({ summary: 'AI summary and tags for a post' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: { summary: 'A short summary.', tags: ['nestjs', 'backend'], source: 'model', truncated: false },
      },
    },
  })
  @ApiTooManyRequestsResponse({ description: '5 summaries per minute per user, or upstream rate limit', schema: { example: rateLimitExample } })
  summarize(@Param('id') id: string) {
    return this.postsService.summarize(id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update a post (owner or admin)' })
  @ApiBody({ type: UpdatePostDto })
  update(@Param('id') id: string, @Req() req: any, @Body() body: UpdatePostDto) {
    return this.postsService.update(id, req.user.userId, req.user.role, body);
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a post (owner or admin)' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.postsService.remove(id, req.user.userId, req.user.role);
  }
  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft deleted post within the 5 day window' })
  restore(@Param('id') id: string, @Req() req: any) {
    return this.postsService.restore(id, req.user.userId, req.user.role);
  }
}