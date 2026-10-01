import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { QueryPostsDto, PostSortOption } from './dto/query-posts.dto.js';
import { SearchPostsDto } from './dto/search-posts.dto.js';
import { SearchRateLimitGuard } from './search-rate-limit.guard.js';
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
  @ApiQuery({ name: 'sort', enum: PostSortOption, required: false, description: 'latest (default), ranked, or discussed' })
  findAll(@Query() query: QueryPostsDto) {
    return this.postsService.findAll(query);
  }
  @Get('search')
  @UseGuards(SearchRateLimitGuard)
  search(@Query() query: SearchPostsDto) {
    return this.postsService.search(query);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }
  @Post(':id/summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: { summary: 'A short summary.', tags: ['nestjs', 'backend'], source: 'model', truncated: false },
      },
    },
  })
  summarize(@Param('id') id: string) {
    return this.postsService.summarize(id);
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