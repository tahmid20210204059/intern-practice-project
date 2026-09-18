import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EducationItemDto } from './education-item.dto.js';
import { ExperienceItemDto } from './experience-item.dto.js';
import { UpdateUserProfileDto } from './update-user-profile.dto.js';
import { UserLinksDto } from './update-links.dto.js';

export class UpdateUserAdminDto extends UpdateUserProfileDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'You can list at most 50 skills' })
  @IsString({ each: true })
  @MaxLength(40, { each: true, message: 'Each skill must be 40 characters or fewer' })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'You can list at most 50 experiences' })
  @ValidateNested({ each: true })
  @Type(() => ExperienceItemDto)
  experiences?: ExperienceItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'You can list at most 50 education items' })
  @ValidateNested({ each: true })
  @Type(() => EducationItemDto)
  education?: EducationItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UserLinksDto)
  links?: UserLinksDto;
}
