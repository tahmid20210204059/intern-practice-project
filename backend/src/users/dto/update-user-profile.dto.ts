import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Name must be 120 characters or fewer' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Headline must be 120 characters or fewer' })
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Bio must be 300 characters or fewer' })
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}