import { IsEnum, IsMongoId } from 'class-validator';
import { ReactionTargetType, ReactionType } from '../schemas/reaction.schema.js';

export class CreateReactionDto {
  @IsEnum(ReactionTargetType, { message: 'targetType must be "post" or "comment"' })
  targetType: ReactionTargetType;

  @IsMongoId({ message: 'targetId must be a valid ID' })
  targetId: string;

  @IsEnum(ReactionType, { message: 'type must be one of: like, love, care, haha, wow, sad, angry' })
  type: ReactionType;
}