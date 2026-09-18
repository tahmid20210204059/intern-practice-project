import { IsOptional, IsString, Matches, MaxLength, Validate } from 'class-validator';
import { isValidLinkUrl } from '../../common/validators.js';

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
  @Validate((value: string | undefined | null) => isValidLinkUrl('github', value), {
    message: 'GitHub URL must be a valid github.com link',
  })
  github?: string;
}