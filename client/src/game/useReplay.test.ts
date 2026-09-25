import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBoard, isSolved, type Move } from '../engine';
import { REPLAY_STEP_MS, useReplay } from './useReplay';

// Solved in two pours: the 1 from tube 1 onto tube 0, then the 2 left in tube 1 onto tube 2.
const start = createBoard([[1], [2, 1], [2], []], 2, 2);
const moves: Move[] = [
  { from: 1, to: 0 },
  { from: 1, to: 2 },
];

function setReducedMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

describe('useReplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the starting board at move 0', () => {
    const { result } = renderHook(() => useReplay(start, moves));

    expect(result.current.index).toBe(0);
    expect(result.current.total).toBe(2);
    expect(result.current.board).toEqual(start);
    expect(result.current.lastMove).toBeNull();
    expect(result.current.playing).toBe(false);
  });

  it('plays one move per step and stops on the solved board', () => {
    const { result } = renderHook(() => useReplay(start, moves));

    act(() => result.current.play());
    expect(result.current.playing).toBe(true);

    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    expect(result.current.index).toBe(1);
    expect(result.current.lastMove).toEqual(moves[0]);

    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    expect(result.current.index).toBe(2);
    expect(isSolved(result.current.board)).toBe(true);
    expect(result.current.playing).toBe(false);

    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS * 3); });
    expect(result.current.index).toBe(2);
  });

  it('pauses and resumes', () => {
    const { result } = renderHook(() => useReplay(start, moves));

    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    act(() => result.current.pause());
    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS * 3); });
    expect(result.current.index).toBe(1);

    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    expect(result.current.index).toBe(2);
  });

  it('restarts from the starting board', () => {
    const { result } = renderHook(() => useReplay(start, moves));

    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    act(() => result.current.restart());

    expect(result.current.index).toBe(0);
    expect(result.current.board).toEqual(start);
    expect(result.current.playing).toBe(false);
  });

  it('steps forward and back by one, within bounds', () => {
    const { result } = renderHook(() => useReplay(start, moves));

    act(() => result.current.prev());
    expect(result.current.index).toBe(0);

    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.index).toBe(2);

    act(() => result.current.prev());
    expect(result.current.index).toBe(1);
  });

  it('never advances by itself with reduced motion', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useReplay(start, moves));

    expect(result.current.reducedMotion).toBe(true);
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS * 5); });

    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(false);
  });
});
