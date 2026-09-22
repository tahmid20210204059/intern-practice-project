import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsMongoId({ message: 'postId must be a valid ID' })
  postId: string;

  @IsOptional()
  @IsMongoId({ message: 'parentCommentId must be a valid ID' })
  parentCommentId?: string;

  @IsNotEmpty({ message: 'Comment body is required' })
  @IsString()
  @MaxLength(2000, { message: 'Comment must be 2000 characters or fewer' })
  body: string;
}