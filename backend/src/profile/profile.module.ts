import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  // UsersModule exports MongooseModule, which re-exports its User model
  // registration — importing it here avoids registering the same schema twice.
  imports: [UsersModule, AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}