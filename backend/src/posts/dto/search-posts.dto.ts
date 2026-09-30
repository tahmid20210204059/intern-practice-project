import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export const MAX_SEARCH_QUERY_LENGTH = 100;
export class SearchPostsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value))
  @IsString({ message: 'q must be a string' })
  @IsNotEmpty({ message: 'Search query is required' })
  @MaxLength(MAX_SEARCH_QUERY_LENGTH, { message: `Search query must be ${MAX_SEARCH_QUERY_LENGTH} characters or fewer` })
  q: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  @Max(100, { message: 'page must be at most 100' })
  page?: number = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit must be at most 50' })
  limit?: number = 10;
}