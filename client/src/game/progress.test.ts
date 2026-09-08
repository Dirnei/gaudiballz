import { afterEach, describe, expect, it, vi } from 'vitest';

let capturedBodies: unknown[] = [];

vi.mock('./completionQueue', () => {
  let stored: { id: string; [k: string]: unknown }[] = [];
  return {
    newId: () => 'test-id',
    enqueue: vi.fn(async (item: { id: string; [k: string]: unknown }) => {
      stored.push(item);
    }),
    pending: vi.fn(async () => [...stored]),
    forget: vi.fn(async (id: string) => {
      stored = stored.filter((s) => s.id !== id);
    }),
    clearQueue: vi.fn(async () => {
      stored = [];
    }),
  };
});

vi.mock('./identity', () => ({
  API: 'http://test',
  authHeaders: (extra: Record<string, string> = {}) => ({ ...extra, Authorization: 'Bearer t' }),
  sessionId: 'test-session-abc',
}));

const { recordCompletion } = await import('./progress');

describe('recordCompletion metadata', () => {
  afterEach(() => {
    capturedBodies = [];
    vi.restoreAllMocks();
  });

  it('sends metadata fields in the POST body', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (init?.body) {
        capturedBodies.push(JSON.parse(init.body as string));
      }
      return {
        ok: true,
        json: () => Promise.resolve({ newAchievements: [] }),
      } as Response;
    });

    await recordCompletion(5, 12, 1, {
      undoCount: 3,
      restarted: true,
      colourCount: 6,
      parMoves: 15,
    });

    expect(capturedBodies.length).toBeGreaterThan(0);
    const body = capturedBodies[0] as Record<string, unknown>;
    expect(body.level).toBe(5);
    expect(body.moves).toBe(12);
    expect(body.hints).toBe(1);
    expect(body.undoCount).toBe(3);
    expect(body.restarted).toBe(true);
    expect(body.sessionId).toBe('test-session-abc');
    expect(body.colourCount).toBe(6);
    expect(body.parMoves).toBe(15);
  });

  it('returns newAchievements from the response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          newAchievements: [{ id: 'milestone-1', name: 'First Steps' }],
        }),
    } as Response);

    const result = await recordCompletion(1, 10, 0, {
      undoCount: 0,
      restarted: false,
      colourCount: 4,
      parMoves: 15,
    });

    expect(result.newAchievements).toEqual([{ id: 'milestone-1', name: 'First Steps' }]);
  });

  it('defaults newAchievements to empty when the field is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await recordCompletion(1, 10, 0, {
      undoCount: 0,
      restarted: false,
      colourCount: 4,
      parMoves: 15,
    });

    expect(result.newAchievements).toEqual([]);
  });

  it('returns empty result on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));

    const result = await recordCompletion(1, 10, 0, {
      undoCount: 0,
      restarted: false,
      colourCount: 4,
      parMoves: 15,
    });

    expect(result.newAchievements).toEqual([]);
  });
});
