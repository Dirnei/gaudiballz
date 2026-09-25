import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyMove, type Board, type Move } from '../engine';

/** How long each move stays on screen while a replay plays. */
export const REPLAY_STEP_MS = 600;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Plays a solved attempt back, one move at a time, on its starting board.
 *
 * Every position is worked out once up front with the same `applyMove` the game uses, which the
 * conformance fixtures prove matches the server that verified the list. Stepping is then only an
 * index into those positions, so back, forward and restart can never drift from the real game.
 *
 * With reduced motion the replay never advances by itself: `play` does nothing and the viewer
 * steps with `next` and `prev`.
 */
export function useReplay(start: Board, moves: readonly Move[]) {
  const reducedMotion = useMemo(prefersReducedMotion, []);

  const boards = useMemo(() => {
    const out: Board[] = [start];
    for (const move of moves) {
      const applied = applyMove(out[out.length - 1], move);
      // A verified list is always legal; stop rather than show a board that never happened.
      if (applied === null) break;
      out.push(applied.board);
    }
    return out;
  }, [start, moves]);

  const total = boards.length - 1;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= total) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, total)), REPLAY_STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, index, total]);

  const play = useCallback(() => {
    if (reducedMotion) return;
    // Playing from the end starts over, so the button always does something.
    setIndex((i) => (i >= total ? 0 : i));
    setPlaying(true);
  }, [reducedMotion, total]);

  const pause = useCallback(() => setPlaying(false), []);

  const restart = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  return {
    board: boards[index],
    index,
    total,
    playing,
    reducedMotion,
    /** The move that led to the board shown, for highlighting its two tubes. */
    lastMove: index > 0 ? moves[index - 1] : null,
    play,
    pause,
    restart,
    next,
    prev,
  };
}
