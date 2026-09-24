import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./identity', async () => {
  const actual = await vi.importActual<typeof import('./identity')>('./identity');
  return { ...actual, ensureIdentity: vi.fn().mockResolvedValue(null) };
});

vi.mock('./progress', async () => {
  const actual = await vi.importActual<typeof import('./progress')>('./progress');
  return { ...actual, drain: vi.fn(), loadProgress: vi.fn().mockResolvedValue(null), recordCompletion: vi.fn().mockResolvedValue({ newAchievements: [], newBadges: [], attemptStars: 0, attemptPoints: 0, starDelta: 0, replayBonus: 0, timeBonus: 0, noHintBonus: 0, firstClearBonus: 0, streakBonus: 0, rankUp: null }) };
});

const { useGame } = await import('./useGame');

const level = {
  levelId: 1,
  tubes: [[1, 1, 1], [2, 3, 2], [3, 2, 3], []],
  capacity: 3,
  colourCount: 3,
  parMoves: 10,
  timeTargetMs: 30000,
  spareTubes: 1,
  chapterNote: null,
  code: 'TEST',
};

describe('finished column tap lock', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...level }),
    }) as any;
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function loadBoard() {
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.load).toBe('ready'));
    return result;
  }

  it('tapping a finished column with nothing selected does not select it', async () => {
    const result = await loadBoard();

    act(() => result.current.tapTube(0));
    expect(result.current.selected).toEqual([]);
  });

  it('tapping a non-finished column still selects it', async () => {
    const result = await loadBoard();

    act(() => result.current.tapTube(2));
    expect(result.current.selected).toEqual([2]);
  });

  it('undo re-enables selection on a previously finished column', async () => {
    const result = await loadBoard();

    // Tube 0 is finished — cannot select
    act(() => result.current.tapTube(0));
    expect(result.current.selected).toEqual([]);

    // Pour from tube 1 into tube 0 is not valid (colour mismatch: tube 1 top is 2, tube 0 top is 1)
    // Instead, pour tube 1 top (colour 2) into empty tube 3 — this makes tube 1 shorter, not finished
    act(() => result.current.tapTube(1));
    expect(result.current.selected).toEqual([1]);
    act(() => result.current.tapTube(3));

    // Now tube 1 is [2, 3] — not finished. Tube 3 is [2]. Undo should restore tube 1 to [2, 3, 2]
    act(() => result.current.undo());

    // After undo, tube 1 is [2, 3, 2] again — not finished, selectable
    act(() => result.current.tapTube(1));
    expect(result.current.selected).toEqual([1]);
  });

  it('tapping a finished column with a source selected attempts a pour to it', async () => {
    const result = await loadBoard();

    act(() => result.current.tapTube(2));
    expect(result.current.selected).toEqual([2]);

    act(() => result.current.tapTube(0));
    expect(result.current.selected).not.toContain(0);
  });
});
