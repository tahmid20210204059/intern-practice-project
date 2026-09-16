import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Empty string is allowed (field left blank); otherwise must be http(s).
const OPTIONAL_URL_REGEX = /^$|^https?:\/\/.+/i;

export class ProjectUrlsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'Live URL must be 2048 characters or fewer' })
  @Matches(OPTIONAL_URL_REGEX, {
    message: 'Live URL must start with http:// or https://',
  })
  live?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'GitHub URL must be 2048 characters or fewer' })
  @Matches(OPTIONAL_URL_REGEX, {
    message: 'GitHub URL must start with http:// or https://',
  })
  github?: string;
}