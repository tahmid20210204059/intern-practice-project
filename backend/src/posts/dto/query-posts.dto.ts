import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export enum PostSortOption {
  LATEST = 'latest',
  RANKED = 'ranked',
  DISCUSSED = 'discussed',
}

export class QueryPostsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number = 20;

  @IsOptional()
  @IsMongoId({ message: 'authorId must be a valid ID' })
  authorId?: string;

  @IsOptional()
  @IsEnum(PostSortOption, { message: 'sort must be one of: latest, ranked, discussed' })
  sort?: PostSortOption = PostSortOption.LATEST;
}