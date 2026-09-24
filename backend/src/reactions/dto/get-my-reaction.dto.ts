import { IsEnum, IsMongoId } from 'class-validator';
import { ReactionTargetType } from '../schemas/reaction.schema.js';

export class GetMyReactionDto {
  @IsEnum(ReactionTargetType, { message: 'targetType must be "post" or "comment"' })
  targetType: ReactionTargetType;

  @IsMongoId({ message: 'targetId must be a valid ID' })
  targetId: string;
}