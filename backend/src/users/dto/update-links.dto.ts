import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, Validate, ValidateNested } from 'class-validator';
import { isValidLinkUrl, type LinkPlatform } from '../../common/validators.js';

const linkValidator = (platform: LinkPlatform, label: string) =>
  Validate((value: string | undefined | null) => isValidLinkUrl(platform, value), {
    message: `${label} link must be a valid ${platform === 'portfolio' ? 'http:// or https://' : `${platform}.com`} URL`,
  });

export class UserLinksDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'Portfolio link must be 2048 characters or fewer' })
  @linkValidator('portfolio', 'Portfolio')
  portfolio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'GitHub link must be 2048 characters or fewer' })
  @linkValidator('github', 'GitHub')
  github?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'LinkedIn link must be 2048 characters or fewer' })
  @linkValidator('linkedin', 'LinkedIn')
  linkedin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'Facebook link must be 2048 characters or fewer' })
  @linkValidator('facebook', 'Facebook')
  facebook?: string;
}

export class UpdateLinksDto {
  @ValidateNested()
  @Type(() => UserLinksDto)
  links: UserLinksDto;
}
