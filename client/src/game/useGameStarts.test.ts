import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./identity', async () => {
  const actual = await vi.importActual<typeof import('./identity')>('./identity');
  return { ...actual, ensureIdentity: vi.fn().mockResolvedValue(null) };
});

const reportGameStarted = vi.fn();

vi.mock('./progress', async () => {
  const actual = await vi.importActual<typeof import('./progress')>('./progress');
  return {
    ...actual,
    drain: vi.fn(),
    loadProgress: vi.fn().mockResolvedValue(null),
    reportAttemptEnded: vi.fn(),
    reportGameStarted: (...args: unknown[]) => reportGameStarted(...args),
  };
});

const { useGame } = await import('./useGame');

/** Tube 3 is a spare, so 1 -> 3 and 2 -> 3 are both legal first moves. */
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

describe('a campaign game is counted when it starts', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    reportGameStarted.mockClear();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...level }) }) as never;
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function loaded() {
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.load).toBe('ready'));
    return result;
  }

  it('is not counted when the level is only opened', async () => {
    await loaded();

    expect(reportGameStarted).not.toHaveBeenCalled();
  });

  it('is counted once on the first move, not on every move', async () => {
    const result = await loaded();

    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(3));
    act(() => result.current.tapTube(2));
    act(() => result.current.tapTube(3));

    expect(reportGameStarted).toHaveBeenCalledTimes(1);
    expect(reportGameStarted).toHaveBeenCalledWith('campaign');
  });

  it('counts again after a restart, once the player moves', async () => {
    const result = await loaded();

    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(3));
    act(() => result.current.restart());
    expect(reportGameStarted).toHaveBeenCalledTimes(1);

    act(() => result.current.tapTube(2));
    act(() => result.current.tapTube(3));

    expect(reportGameStarted).toHaveBeenCalledTimes(2);
  });
});
