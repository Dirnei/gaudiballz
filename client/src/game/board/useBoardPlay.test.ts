import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBoard, type Board } from '../../engine';
import { HINT_COOLDOWN_MS, UNDOS_PER_ATTEMPT } from '../attempt';
import { useBoardPlay } from './useBoardPlay';

// Tube 0 is finished; 1 and 2 are mixed; 3 is the spare.
const board = createBoard([[1, 1, 1], [2, 3, 2], [3, 2, 3], []], 3, 3);

function render(initial: { board: Board | null; resetKey: unknown }) {
  return renderHook((props) => useBoardPlay(props), { initialProps: initial });
}

describe('useBoardPlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never picks up a finished column', () => {
    const { result } = render({ board, resetKey: 1 });

    act(() => result.current.tapTube(0));

    expect(result.current.selected).toBeNull();
  });

  it('picks up the tapped tube when the pour would be illegal', () => {
    const { result } = render({ board, resetKey: 1 });

    act(() => result.current.tapTube(1));
    // Top 2 onto top 3: colour mismatch.
    act(() => result.current.tapTube(2));

    expect(result.current.selected).toBe(2);
    expect(result.current.moveCount).toBe(0);
  });

  it('clears the selection instead when the illegal target cannot be picked up', () => {
    const { result } = render({ board, resetKey: 1 });

    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(0));

    expect(result.current.selected).toBeNull();
  });

  it('pours on the second tap and reports the move', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useBoardPlay({ board, resetKey: 1, onMove }));

    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(3));

    expect(result.current.state?.moves).toEqual([{ from: 1, to: 3 }]);
    expect(result.current.moveCount).toBe(1);
    expect(result.current.selected).toBeNull();
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('spends one undo per undo and counts it', () => {
    const { result } = render({ board, resetKey: 1 });

    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(3));
    act(() => result.current.undo());

    expect(result.current.state?.moves).toEqual([]);
    expect(result.current.undosRemaining).toBe(UNDOS_PER_ATTEMPT - 1);
    expect(result.current.undosUsed).toBe(1);
  });

  it('arms the hint cooldown as soon as an attempt begins, even before a board arrives', async () => {
    const { result } = render({ board: null, resetKey: 1 });

    expect(result.current.hintCooldownEnd).not.toBeNull();
    expect(result.current.canHint).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(HINT_COOLDOWN_MS);
    });

    expect(result.current.hintCooldownEnd).toBeNull();
  });

  it('starts over when the reset key changes', async () => {
    const { result, rerender } = render({ board, resetKey: 1 });

    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(3));
    act(() => result.current.undo());
    await act(async () => {
      vi.advanceTimersByTime(HINT_COOLDOWN_MS);
    });
    expect(result.current.hintCooldownEnd).toBeNull();

    const next = createBoard([[1, 1, 1], [2, 3, 2], [3, 2, 3], []], 3, 3);
    rerender({ board: next, resetKey: 2 });

    expect(result.current.state?.moves).toEqual([]);
    expect(result.current.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
    expect(result.current.undosUsed).toBe(0);
    expect(result.current.hintCooldownEnd).not.toBeNull();
  });

  it('restart returns to the starting board with fresh budgets', () => {
    const { result } = render({ board, resetKey: 1 });

    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(3));
    act(() => result.current.undo());
    act(() => result.current.tapTube(2));
    act(() => result.current.tapTube(3));
    act(() => result.current.restart());

    expect(result.current.board).toEqual(board);
    expect(result.current.moveCount).toBe(0);
    expect(result.current.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
  });
});
