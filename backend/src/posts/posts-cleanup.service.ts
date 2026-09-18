import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostsService } from './posts.service.js';

@Injectable()
export class PostsCleanupService {
  private readonly logger = new Logger(PostsCleanupService.name);

  constructor(private postsService: PostsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpiredPostsCleanup() {
    const result = await this.postsService.hardDeleteExpired();
    if (result.deletedCount > 0) {
      this.logger.log(`Permanently deleted ${result.deletedCount} expired post(s)`);
    }
  }
}