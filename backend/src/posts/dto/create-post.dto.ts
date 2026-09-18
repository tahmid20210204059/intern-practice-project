import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @MaxLength(150, { message: 'Title must be 150 characters or fewer' })
  title: string;

  @IsNotEmpty({ message: 'Body is required' })
  @IsString()
  @MaxLength(5000, { message: 'Body must be 5000 characters or fewer' })
  body: string;
}
