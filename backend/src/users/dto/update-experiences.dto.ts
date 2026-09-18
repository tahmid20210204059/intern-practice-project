import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { ExperienceItemDto } from './experience-item.dto.js';

export class UpdateExperiencesDto {
  @IsArray()
  @ArrayMaxSize(50, { message: 'You can list at most 50 experiences' })
  @ValidateNested({ each: true })
  @Type(() => ExperienceItemDto)
  experiences: ExperienceItemDto[];
}
