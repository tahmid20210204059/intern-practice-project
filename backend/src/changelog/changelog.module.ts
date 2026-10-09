import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { ChangelogController } from './changelog.controller.js';
import { ChangelogService } from './changelog.service.js';
import { ChangelogEntry, ChangelogEntrySchema } from './schemas/changelog-entry.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ChangelogEntry.name, schema: ChangelogEntrySchema }]), AuthModule],
  controllers: [ChangelogController],
  providers: [ChangelogService],
})
export class ChangelogModule {}
