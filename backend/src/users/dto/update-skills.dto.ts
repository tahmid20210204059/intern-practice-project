import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class UpdateSkillsDto {
  @IsArray()
  @ArrayMaxSize(50, { message: 'You can list at most 50 skills' })
  @IsString({ each: true })
  @MaxLength(40, { each: true, message: 'Each skill must be 40 characters or fewer' })
  skills: string[];
}
