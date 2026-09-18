import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  IsAfterOrEqualMonth,
  IsNotFutureMonth,
} from '../../common/validators/date-range.validator.js';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class EducationItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Degree is required' })
  @MaxLength(120, { message: 'Degree must be 120 characters or fewer' })
  degree: string;

  @IsString()
  @IsNotEmpty({ message: 'Institute is required' })
  @MaxLength(120, { message: 'Institute must be 120 characters or fewer' })
  institute: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Subject must be 120 characters or fewer' })
  subject?: string;

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
}
