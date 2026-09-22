import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { PostsModule } from './posts/posts.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { CommentsModule } from './comments/comments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env', '../backend/.env'],
    }),
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    ScheduleModule.forRoot(),
    HealthModule,
    ProfileModule,
    PostsModule,
    UploadsModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}