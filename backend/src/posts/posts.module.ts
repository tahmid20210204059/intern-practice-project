import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from './schemas/post.schema.js';
import { PostsService } from './posts.service.js';
import { PostsController } from './posts.controller.js';
import { PostsAdminController } from './posts-admin.controller.js';
import { PostsCleanupService } from './posts-cleanup.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [PostsController, PostsAdminController],
  providers: [PostsService, PostsCleanupService],
})
export class PostsModule {}