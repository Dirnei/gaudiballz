import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAchievements } from './achievements';

describe('loadAchievements', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a successful response', async () => {
    const payload = {
      achievements: [
        {
          id: 'milestone-1',
          name: 'First Steps',
          description: 'Complete 1 level',
          category: 'milestone',
          earned: true,
          awardedAt: '2026-09-01T00:00:00Z',
          threshold: 1,
          progress: 1,
        },
        {
          id: 'milestone-5',
          name: 'Getting Started',
          description: 'Complete 5 levels',
          category: 'milestone',
          earned: false,
          awardedAt: null,
          threshold: 5,
          progress: 3,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    } as Response);

    const result = await loadAchievements();

    expect(result).not.toBeNull();
    expect(result!.achievements).toHaveLength(2);
    expect(result!.achievements[0].id).toBe('milestone-1');
    expect(result!.achievements[0].earned).toBe(true);
    expect(result!.achievements[1].earned).toBe(false);
    expect(result!.achievements[1].progress).toBe(3);
  });

  it('returns null on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    expect(await loadAchievements()).toBeNull();
  });

  it('returns null on a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));

    expect(await loadAchievements()).toBeNull();
  });
});
