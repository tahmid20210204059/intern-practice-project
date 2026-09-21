import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Title must be 150 characters or fewer' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Body must be 5000 characters or fewer' })
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'Image URL must be 2048 characters or fewer' })
  @Matches(/^$|^https?:\/\/.+/i, { message: 'Image URL must be a valid URL' })
  imageUrl?: string;
}