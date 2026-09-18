import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  IsAfterOrEqualMonth,
  IsNotFutureMonth,
} from '../../common/validators/date-range.validator.js';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class ExperienceItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(120, { message: 'Title must be 120 characters or fewer' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Company is required' })
  @MaxLength(120, { message: 'Company must be 120 characters or fewer' })
  company: string;

  @IsString()
  @IsNotEmpty({ message: 'Start date is required' })
  @Matches(MONTH_REGEX, { message: 'Start date must be in YYYY-MM format' })
  @IsNotFutureMonth({ message: 'Start date cannot be in the future' })
  from: string;

  @IsOptional()
  @IsString()
  @Matches(MONTH_REGEX, { message: 'End date must be in YYYY-MM format' })
  @IsAfterOrEqualMonth('from', { message: 'End date cannot be before the start date' })
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must be 500 characters or fewer' })
  description?: string;
}
