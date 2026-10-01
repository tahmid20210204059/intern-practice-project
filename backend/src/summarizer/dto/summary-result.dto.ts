import { ArrayMaxSize, IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MAX_SUMMARY_TAGS, MAX_TAG_LENGTH, SUMMARY_MAX_LENGTH } from '../summarizer.constants.js';
export class SummaryResultDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(SUMMARY_MAX_LENGTH)
  summary: string;
  @IsArray()
  @ArrayMaxSize(MAX_SUMMARY_TAGS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(MAX_TAG_LENGTH, { each: true })
  tags: string[];
}