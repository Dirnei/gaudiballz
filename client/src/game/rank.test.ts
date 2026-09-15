import { describe, expect, it } from 'vitest';
import { rankFromXp, nextThreshold } from './rank';

describe('rankFromXp', () => {
  it('returns Bronze 1 at 0 XP', () => {
    expect(rankFromXp(0)).toEqual({ tier: 'bronze', subLevel: 1 });
  });

  it('returns Bronze 2 at 8000 XP', () => {
    expect(rankFromXp(8_000)).toEqual({ tier: 'bronze', subLevel: 2 });
  });

  it('returns Silver 1 at 80000 XP', () => {
    expect(rankFromXp(80_000)).toEqual({ tier: 'silver', subLevel: 1 });
  });

  it('returns Gold 1 at 480000 XP', () => {
    expect(rankFromXp(480_000)).toEqual({ tier: 'gold', subLevel: 1 });
  });

  it('returns Platinum 1 at 1M XP', () => {
    expect(rankFromXp(1_000_000)).toEqual({ tier: 'platinum', subLevel: 1 });
  });

  it('returns Diamond 1 at 1.6M XP', () => {
    expect(rankFromXp(1_600_000)).toEqual({ tier: 'diamond', subLevel: 1 });
  });

  it('caps at Diamond 5', () => {
    expect(rankFromXp(2_000_000)).toEqual({ tier: 'diamond', subLevel: 5 });
    expect(rankFromXp(5_000_000)).toEqual({ tier: 'diamond', subLevel: 5 });
  });
});

describe('nextThreshold', () => {
  it('returns 8000 for Bronze 1', () => {
    expect(nextThreshold(0)).toBe(8_000);
  });

  it('returns null at max rank', () => {
    expect(nextThreshold(2_000_000)).toBeNull();
  });
});
