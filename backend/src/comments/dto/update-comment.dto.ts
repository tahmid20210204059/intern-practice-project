import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsNotEmpty({ message: 'Comment body is required' })
  @IsString()
  @MaxLength(2000, { message: 'Comment must be 2000 characters or fewer' })
  body: string;
}