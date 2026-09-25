import { describe, expect, it } from 'vitest';
import { missedStarReasons } from './missedStarReasons';

const base = { moves: 12, par: 12, elapsedMs: 25_000, timeTargetMs: 30_000, hintsUsed: 0 };

describe('missedStarReasons', () => {
  it('reports how many moves over par', () => {
    expect(missedStarReasons({ ...base, moves: 14 })).toEqual([{ kind: 'moves', over: 2 }]);
  });

  it('reports the time over target when under par but slow', () => {
    expect(missedStarReasons({ ...base, moves: 11, elapsedMs: 34_200 })).toEqual([
      { kind: 'time', overSeconds: 4.2 },
    ]);
  });

  it('lists both when over par and slow', () => {
    expect(missedStarReasons({ ...base, moves: 15, elapsedMs: 40_000 })).toEqual([
      { kind: 'moves', over: 3 },
      { kind: 'time', overSeconds: 10 },
    ]);
  });

  it('reports a used hint first', () => {
    expect(missedStarReasons({ ...base, moves: 8, hintsUsed: 1 })).toEqual([{ kind: 'hints' }]);
  });

  it('rounds a sliver over the target up to 0.1s rather than showing zero', () => {
    expect(missedStarReasons({ ...base, elapsedMs: 30_010 })).toEqual([
      { kind: 'time', overSeconds: 0.1 },
    ]);
  });

  it('returns nothing for a 3-star attempt, including exactly at par and target', () => {
    expect(missedStarReasons(base)).toEqual([]);
    expect(missedStarReasons({ ...base, elapsedMs: 30_000 })).toEqual([]);
  });

  it('skips checks it has no reference for', () => {
    expect(missedStarReasons({ ...base, par: 0, moves: 99, timeTargetMs: undefined, elapsedMs: 999_000 })).toEqual([]);
  });
});
