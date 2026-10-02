import { buildRankScoreAggregationStage, calculateEngagement, calculateRankScore, RANKING_CONFIG } from './ranking.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3600000);

interface Item { id: string; likeCount: number; commentCount: number; createdAt: Date }

const order = (items: Item[]) =>
  items
    .map((item) => ({ ...item, score: calculateRankScore(item, NOW) }))
    .sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .map((item) => item.id);

describe('ranked feed ordering', () => {
  const items: Item[] = [
    { id: 'old-engaged', likeCount: 10, commentCount: 5, createdAt: hoursAgo(24 * 30) },
    { id: 'zero-fresh', likeCount: 0, commentCount: 0, createdAt: hoursAgo(1) },
    { id: 'high-fresh', likeCount: 50, commentCount: 30, createdAt: hoursAgo(1) },
  ];

  it('orders high engagement first, zero engagement next and stale posts last', () => {
    expect(order(items)).toEqual(['high-fresh', 'zero-fresh', 'old-engaged']);
  });

  it('is independent of the input order', () => {
    expect(order([...items].reverse())).toEqual(order(items));
  });

  it('breaks exact ties by id descending so pagination is stable', () => {
    const createdAt = hoursAgo(5);
    const tie = [
      { id: 'a', likeCount: 5, commentCount: 5, createdAt },
      { id: 'b', likeCount: 5, commentCount: 5, createdAt },
    ];
    expect(order(tie)).toEqual(['b', 'a']);
    expect(order([...tie].reverse())).toEqual(['b', 'a']);
  });

  it('makes a stale post score negative', () => {
    expect(calculateRankScore(items[0], NOW)).toBeLessThan(0);
  });
});

describe('ranking formula properties', () => {
  it('weights one comment the same as two likes', () => {
    expect(calculateEngagement(2, 0)).toBe(calculateEngagement(0, 1));
    expect(RANKING_CONFIG.ENGAGEMENT_WEIGHTS.comment).toBe(2 * RANKING_CONFIG.ENGAGEMENT_WEIGHTS.like);
  });

  it('gives diminishing returns for additional engagement', () => {
    const base = { likeCount: 0, commentCount: 0, createdAt: NOW };
    const early = calculateRankScore({ ...base, likeCount: 10 }, NOW) - calculateRankScore(base, NOW);
    const late = calculateRankScore({ ...base, likeCount: 110 }, NOW) - calculateRankScore({ ...base, likeCount: 100 }, NOW);
    expect(early).toBeGreaterThan(late * 10);
  });

  it('decays linearly by 1 point per gravity window', () => {
    const input = { likeCount: 10, commentCount: 5 };
    const fresh = calculateRankScore({ ...input, createdAt: hoursAgo(36) }, NOW);
    const older = calculateRankScore({ ...input, createdAt: hoursAgo(72) }, NOW);
    expect(fresh - older).toBeCloseTo(1, 10);
  });

  it('builds a database expression driven by the server clock and createdAt', () => {
    const serialized = JSON.stringify(buildRankScoreAggregationStage());
    expect(serialized).toContain('$$NOW');
    expect(serialized).toContain('$createdAt');
    expect(serialized).toContain('$likeCount');
    expect(serialized).toContain('$commentCount');
  });
});

