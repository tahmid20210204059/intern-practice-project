import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { EducationItemDto } from './education-item.dto.js';

export class UpdateEducationDto {
  @IsArray()
  @ArrayMaxSize(50, { message: 'You can list at most 50 education items' })
  @ValidateNested({ each: true })
  @Type(() => EducationItemDto)
  education: EducationItemDto[];
}
