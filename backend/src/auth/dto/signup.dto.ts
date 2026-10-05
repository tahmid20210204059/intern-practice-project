import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120, { message: 'Name must be 120 characters or fewer' })
  name: string;

  @IsEmail()
  @MaxLength(254, { message: 'Email must be 254 characters or fewer' })
  email: string;

  @MinLength(8)
  @MaxLength(72, { message: 'Password must be 72 characters or fewer' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number',
  })
  password: string;
}