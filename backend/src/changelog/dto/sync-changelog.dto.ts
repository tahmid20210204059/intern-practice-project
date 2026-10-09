import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncChangelogDto {
  @ApiPropertyOptional({ example: 'acme/widgets', description: 'Falls back to CHANGELOG_DEFAULT_REPO when omitted.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  repo?: string;
}
