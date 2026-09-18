import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PortfolioProjectDto } from './portfolio-project.dto.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Headline must be 120 characters or fewer' })
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Bio must be 300 characters or fewer' })
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'You can list at most 50 skills' })
  @IsString({ each: true })
  @MaxLength(40, { each: true, message: 'Each skill must be 40 characters or fewer' })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'You can list at most 30 portfolio projects' })
  @ValidateNested({ each: true })
  @Type(() => PortfolioProjectDto)
  portfolioProjects?: PortfolioProjectDto[];
}