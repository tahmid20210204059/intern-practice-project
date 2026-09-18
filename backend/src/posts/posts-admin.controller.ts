import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { PostsService } from './posts.service.js';
import { QueryPostsDto } from './dto/query-posts.dto.js';

@ApiTags('Posts Admin')
@ApiBearerAuth()
@Controller('posts/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PostsAdminController {
  constructor(private postsService: PostsService) {}

  @Get('deleted')
  findDeleted(@Query() query: QueryPostsDto) {
    return this.postsService.findDeletedForAdmin(query);
  }

  @Delete(':id/permanent')
  permanentlyDelete(@Param('id') id: string) {
    return this.postsService.permanentlyDelete(id);
  }
}