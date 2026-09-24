import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportGameStarted = vi.fn();

vi.mock('./progress', async () => {
  const actual = await vi.importActual<typeof import('./progress')>('./progress');
  return { ...actual, reportGameStarted: (...args: unknown[]) => reportGameStarted(...args) };
});

const { useDailyGame } = await import('./useDailyGame');

/** Tube 3 is a spare, so 1 -> 3 and 2 -> 3 are both legal first moves. */
const puzzle = {
  date: '2026-09-24',
  tubes: [[1, 1, 1], [2, 3, 2], [3, 2, 3], []],
  capacity: 3,
  colourCount: 3,
  parMoves: 10,
  timeTargetMs: 30000,
};

describe('a daily challenge game is counted when it starts', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    reportGameStarted.mockClear();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...puzzle }) }) as never;
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function loaded() {
    const { result } = renderHook(() => useDailyGame());
    await waitFor(() => expect(result.current.load).toBe('ready'));
    return result;
  }

  it('is not counted when the puzzle is only opened', async () => {
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
    expect(reportGameStarted).toHaveBeenCalledWith('daily');
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
