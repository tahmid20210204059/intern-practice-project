import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  IsAfterOrEqualMonth,
  IsNotFutureMonth,
} from '../../common/validators/date-range.validator.js';
import { ProjectUrlsDto } from './project-urls.dto.js';

// Matches the "YYYY-MM" format produced by <input type="month">, the same
// convention already used for Experience/Education from/to fields.
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class PortfolioProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Project title is required' })
  @MaxLength(120, { message: 'Project title must be 120 characters or fewer' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Project description must be 500 characters or fewer',
  })
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectUrlsDto)
  urls?: ProjectUrlsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'A project can list at most 20 technologies' })
  @IsString({ each: true })
  @MaxLength(40, {
    each: true,
    message: 'Each technology must be 40 characters or fewer',
  })
  technologies?: string[];

  @IsString()
  @IsNotEmpty({ message: 'Start date is required' })
  @Matches(MONTH_REGEX, { message: 'Start date must be in YYYY-MM format' })
  @IsNotFutureMonth({ message: 'Start date cannot be in the future' })
  from: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  // "to" is required unless the project is marked as ongoing (isCurrent: true).
  @ValidateIf((project: PortfolioProjectDto) => !project.isCurrent)
  @IsString()
  @IsNotEmpty({ message: 'End date is required unless the project is ongoing' })
  @Matches(MONTH_REGEX, { message: 'End date must be in YYYY-MM format' })
  @IsAfterOrEqualMonth('from', {
    message: 'End date cannot be before the start date',
  })
  to?: string;
}