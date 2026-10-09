import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListChangelogDto {
  @ApiPropertyOptional({ example: 'acme/widgets', description: 'Optional owner/repo filter.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  repo?: string;
}
