import { calculateEngagement, calculateRankScore, RANKING_CONFIG, buildRankScoreAggregationStage } from './ranking.js';

describe('calculateEngagement', () => {
  it('weights comments more heavily than likes', () => {
    const likesOnly = calculateEngagement(10, 0);
    const commentsOnly = calculateEngagement(0, 10);
    expect(commentsOnly).toBeGreaterThan(likesOnly);
  });

  it('clamps negative inputs to zero engagement instead of throwing', () => {
    expect(calculateEngagement(-5, -5)).toBe(0);
  });

  it('treats non-finite input as zero', () => {
    expect(calculateEngagement(Number.NaN, 3)).toBe(3 * RANKING_CONFIG.ENGAGEMENT_WEIGHTS.comment);
  });
});

describe('calculateRankScore', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('gives a brand-new post with zero engagement a score of exactly 0', () => {
    const score = calculateRankScore({ likeCount: 0, commentCount: 0, createdAt: now }, now);
    expect(score).toBe(0);
  });

  it('ranks higher engagement above lower engagement at the same age', () => {
    const low = calculateRankScore({ likeCount: 1, commentCount: 0, createdAt: now }, now);
    const high = calculateRankScore({ likeCount: 50, commentCount: 20, createdAt: now }, now);
    expect(high).toBeGreaterThan(low);
  });

  it('ranks a newer post above an older post with identical engagement', () => {
    const fresh = calculateRankScore({ likeCount: 10, commentCount: 5, createdAt: now }, now);
    const oneDayOld = calculateRankScore(
      { likeCount: 10, commentCount: 5, createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      now,
    );
    expect(fresh).toBeGreaterThan(oneDayOld);
  });

  it('produces identical scores for identical inputs (true ties must be broken outside this function)', () => {
    const a = calculateRankScore({ likeCount: 5, commentCount: 5, createdAt: now }, now);
    const b = calculateRankScore({ likeCount: 5, commentCount: 5, createdAt: now }, now);
    expect(a).toBe(b);
  });

  it('goes negative for an old post with engagement too low to offset its age', () => {
    const veryOld = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const score = calculateRankScore({ likeCount: 2, commentCount: 1, createdAt: veryOld }, now);
    expect(score).toBeLessThan(0);
  });

  it('matches a hand-computed value for a known input', () => {
    const createdAt = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const score = calculateRankScore({ likeCount: 10, commentCount: 4, createdAt }, now);
    const expected = Math.log10(19) - 1;
    expect(score).toBeCloseTo(expected, 10);
  });

  it('defaults `now` to the current time when not provided', () => {
    const score = calculateRankScore({ likeCount: 0, commentCount: 0, createdAt: new Date() });
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeCloseTo(0, 2);
  });
});

describe('buildRankScoreAggregationStage', () => {
  it('bakes in the same weights and gravity as the pure function', () => {
    const stage = buildRankScoreAggregationStage() as any;
    expect(stage.$addFields).toBeDefined();
    expect(stage.$addFields.rankScore).toBeDefined();

    const engagementExpr = stage.$addFields.rankScore.$subtract[0].$log10.$add[0].$max[0].$add;
    expect(engagementExpr[0].$multiply[1]).toBe(RANKING_CONFIG.ENGAGEMENT_WEIGHTS.like);
    expect(engagementExpr[1].$multiply[1]).toBe(RANKING_CONFIG.ENGAGEMENT_WEIGHTS.comment);

    const gravityMs = stage.$addFields.rankScore.$subtract[1].$divide[1];
    expect(gravityMs).toBe(RANKING_CONFIG.GRAVITY_HOURS * 60 * 60 * 1000);
  });
});