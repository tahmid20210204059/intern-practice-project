import { Module } from '@nestjs/common';
import { SummarizerService } from './summarizer.service.js';
@Module({
  providers: [SummarizerService],
  exports: [SummarizerService],
})
export class SummarizerModule {}