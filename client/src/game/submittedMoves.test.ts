import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMove, createBoard, isSolved, ON_REQUEST, RULES_VERSION, solve, type Board, type Move } from '../engine';
import { HINT_COOLDOWN_MS } from './attempt';
import { useBoardPlay } from './board/useBoardPlay';

vi.mock('./completionQueue', () => {
  let stored: { id: string; [k: string]: unknown }[] = [];
  return {
    newId: () => 'test-id',
    enqueue: vi.fn(async (item: { id: string; [k: string]: unknown }) => { stored.push(item); }),
    pending: vi.fn(async () => [...stored]),
    forget: vi.fn(async (id: string) => { stored = stored.filter((s) => s.id !== id); }),
    clearQueue: vi.fn(async () => { stored = []; }),
  };
});

vi.mock('./identity', () => ({
  API: 'http://test',
  authHeaders: (extra: Record<string, string> = {}) => ({ ...extra, Authorization: 'Bearer t' }),
  sessionId: 'test-session',
}));

const { recordCompletion } = await import('./progress');

// Two full flasks topped with colour 1 (so they can be poured together), one more full flask,
// and two empties.
const start: Board = createBoard([[2, 1, 1], [3, 3, 1], [2, 2, 3], [], []], 3, 3);

function replay(board: Board, moves: readonly Move[]): Board | null {
  let current = board;
  for (const move of moves) {
    const applied = applyMove(current, move);
    if (applied === null) return null;
    current = applied.board;
  }
  return current;
}

describe('the move list a completion submits', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('replays to the solved board, without undone moves and with the hint move', async () => {
    const { result } = renderHook(() => useBoardPlay({ board: start, resetKey: 1 }));

    // A multi-pour: both flasks topped with 1 into the empty flask 3.
    act(() => result.current.tapTube(0));
    act(() => result.current.tapTube(1));
    act(() => result.current.tapTube(3));
    expect(result.current.state!.moves).toEqual([{ from: 0, to: 3 }, { from: 1, to: 3 }]);

    // A move that is taken back.
    act(() => result.current.pour(2, 4));
    act(() => result.current.undo());

    // A hint, once its cooldown has passed.
    act(() => { vi.advanceTimersByTime(HINT_COOLDOWN_MS + 1); });
    act(() => result.current.useHint());
    const hinted = result.current.state!.moves[2];
    expect(hinted).toBeDefined();

    // The rest, by the solver.
    for (const move of solve(result.current.state!.board, ON_REQUEST).path) {
      act(() => result.current.pour(move.from, move.to));
    }
    expect(result.current.solved).toBe(true);

    let body: Record<string, unknown> = {};
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      body = JSON.parse(init!.body as string) as Record<string, unknown>;
      return { ok: true, json: () => Promise.resolve({}) } as Response;
    });

    vi.useRealTimers();
    await recordCompletion(1, result.current.moveCount, 1, {
      undoCount: 1,
      restarted: false,
      colourCount: 3,
      parMoves: 0,
      moveList: result.current.state!.moves,
    });

    const sent = (body.moveList as number[][]).map(([from, to]) => ({ from, to }));
    expect(body.rulesVersion).toBe(RULES_VERSION);
    expect(isSolved(replay(start, sent)!)).toBe(true);
    // The undone pour is gone, so the list is one shorter than the moves counted.
    expect(sent.length).toBe(result.current.moveCount - 1);
    expect(sent[2]).toEqual(hinted);
  });
});
