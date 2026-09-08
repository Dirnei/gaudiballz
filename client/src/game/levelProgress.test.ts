import { describe, expect, it } from 'vitest';
import { buildLevelProgress } from './useGame';
import type { Progress } from './progress';

describe('buildLevelProgress', () => {
  it('returns an empty map when progress is null', () => {
    expect(buildLevelProgress(null).size).toBe(0);
  });

  it('returns an empty map when no levels are completed', () => {
    const progress: Progress = { levelsCompleted: 0, highestCompleted: 0, totalPoints: 0, levels: [] };
    expect(buildLevelProgress(progress).size).toBe(0);
  });

  it('builds a map from the levels array with moves, hints, stars and points per level', () => {
    const progress: Progress = {
      levelsCompleted: 3,
      highestCompleted: 5,
      totalPoints: 850,
      levels: [
        { level: 1, moves: 10, hints: 0, stars: 3, points: 500 },
        { level: 3, moves: 14, hints: 1, stars: 1, points: 100 },
        { level: 5, moves: 22, hints: 2, stars: 2, points: 250 },
      ],
    };

    const map = buildLevelProgress(progress);

    expect(map.size).toBe(3);
    expect(map.get(1)).toEqual({ moves: 10, hints: 0, stars: 3, points: 500 });
    expect(map.get(3)).toEqual({ moves: 14, hints: 1, stars: 1, points: 100 });
    expect(map.get(5)).toEqual({ moves: 22, hints: 2, stars: 2, points: 250 });
    expect(map.has(2)).toBe(false);
  });

  it('provides O(1) lookup by level number', () => {
    const progress: Progress = {
      levelsCompleted: 1,
      highestCompleted: 42,
      totalPoints: 250,
      levels: [{ level: 42, moves: 18, hints: 0, stars: 2, points: 250 }],
    };

    const map = buildLevelProgress(progress);

    expect(map.get(42)).toEqual({ moves: 18, hints: 0, stars: 2, points: 250 });
    expect(map.get(1)).toBeUndefined();
  });
});
