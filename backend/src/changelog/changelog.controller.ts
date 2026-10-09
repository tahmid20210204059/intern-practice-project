import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { ChangelogService } from './changelog.service.js';
import { SyncChangelogDto } from './dto/sync-changelog.dto.js';
import { ListChangelogDto } from './dto/list-changelog.dto.js';

@ApiTags('Changelog')
@ApiBearerAuth()
@Controller('changelog')
@UseGuards(JwtAuthGuard)
export class ChangelogController {
  constructor(private changelogService: ChangelogService) {}

  @Get()
  @ApiOperation({ summary: 'List stored changelog entries (reads the database only, never GitHub)' })
  list(@Query() query: ListChangelogDto) {
    return this.changelogService.list(query.repo);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'changelog-sync', limit: 5, windowMs: 60 * 1000, by: 'user', message: 'Changelog sync is limited to 5 requests per minute. Please wait and try again.' })
  @ApiOperation({ summary: 'Fetch the last PR merged into main and upsert it', description: 'Invalid owner/repo returns 400. GitHub 403/429/timeout/5xx are mapped to 429/502/504 with a stable error shape.' })
  @ApiBody({ type: SyncChangelogDto })
  @ApiTooManyRequestsResponse({ description: '5 syncs per minute per user, or upstream GitHub rate limit' })
  sync(@Body() body: SyncChangelogDto) {
    return this.changelogService.sync(body.repo);
  }
}
