import type { PipelineStage } from 'mongoose';

export const RANKING_CONFIG = {
  ENGAGEMENT_WEIGHTS: {
    like: 1,
    comment: 2,
  },
  GRAVITY_HOURS: 36,
} as const;

export interface RankScoreInput {
  likeCount: number;
  commentCount: number;
  createdAt: Date;
}

export function calculateEngagement(likeCount: number, commentCount: number): number {
  const safeLikes = Number.isFinite(likeCount) ? likeCount : 0;
  const safeComments = Number.isFinite(commentCount) ? commentCount : 0;
  const raw =
    safeLikes * RANKING_CONFIG.ENGAGEMENT_WEIGHTS.like +
    safeComments * RANKING_CONFIG.ENGAGEMENT_WEIGHTS.comment;
  return Math.max(raw, 0);
}

export function calculateRankScore(input: RankScoreInput, now: Date = new Date()): number {
  const engagement = calculateEngagement(input.likeCount, input.commentCount);
  const engagementScore = Math.log10(engagement + 1);
  const ageMs = now.getTime() - input.createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const decay = ageHours / RANKING_CONFIG.GRAVITY_HOURS;
  return engagementScore - decay;
}

export function buildRankScoreAggregationStage(): PipelineStage {
  const { like, comment } = RANKING_CONFIG.ENGAGEMENT_WEIGHTS;
  const gravityMs = RANKING_CONFIG.GRAVITY_HOURS * 60 * 60 * 1000;

  return {
    $addFields: {
      rankScore: {
        $subtract: [
          {
            $log10: {
              $add: [
                {
                  $max: [
                    {
                      $add: [
                        { $multiply: ['$likeCount', like] },
                        { $multiply: ['$commentCount', comment] },
                      ],
                    },
                    0,
                  ],
                },
                1,
              ],
            },
          },
          { $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, gravityMs] },
        ],
      },
    },
  };
}