import { useCallback, useEffect, useRef, useState } from 'react';
import { API, authHeaders } from './identity';
import { useBoardPlay } from './board/useBoardPlay';
import { createBoard, isSolved, type Board } from '../engine';

export type DailyLoadState = 'loading' | 'ready' | 'error';

interface DailyPuzzle {
  readonly date: string;
  readonly tubes: number[][];
  readonly capacity: number;
  readonly colourCount: number;
  readonly parMoves: number;
  readonly timeTargetMs: number;
}

interface CompletionResult {
  readonly stars: number;
  readonly points: number;
  readonly isNewBest: boolean;
}

const DAILY_DONE_KEY = 'puzzle.dailyDone';

function isDailyDoneToday(): boolean {
  try {
    const stored = localStorage.getItem(DAILY_DONE_KEY);
    if (!stored) return false;
    const now = new Date();
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    return stored === todayStr;
  } catch {
    return false;
  }
}

export function useDailyGame() {
  const [load, setLoad] = useState<DailyLoadState>('loading');
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(isDailyDoneToday);

  // One puzzle per visit, so one attempt: the reset key never changes.
  const game = useBoardPlay({ board, resetKey: 'daily' });
  const { state, elapsed, hintsUsed } = game;

  /** Fetch today's puzzle on mount. */
  useEffect(() => {
    let cancelled = false;
    setLoad('loading');

    fetch(`${API}/api/v1/daily/today`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`Daily returned ${res.status}`);
        return res.json() as Promise<DailyPuzzle>;
      })
      .then((data) => {
        if (cancelled) return;
        setPuzzle(data);
        setBoard(createBoard(data.tubes, data.capacity, data.colourCount));
        setLoad('ready');
      })
      .catch(() => {
        if (!cancelled) setLoad('error');
      });

    return () => { cancelled = true; };
  }, []);

  const restartBoard = game.restart;
  const restart = useCallback(() => {
    restartBoard();
    setCompletion(null);
  }, [restartBoard]);

  /** Record completion once per solved attempt. */
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (state === null || !isSolved(state.board)) return;

    const key = `${game.moveCount}:${hintsUsed}`;
    if (recorded.current === key) return;
    recorded.current = key;

    void (async () => {
      try {
        const res = await fetch(`${API}/api/v1/daily/completions`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            moves: game.moveCount,
            hints: hintsUsed,
            elapsedTimeMs: elapsed.elapsedMs(),
          }),
        });
        if (res.ok) {
          const result = (await res.json()) as CompletionResult;
          setCompletion(result);
          setAlreadyDone(true);

          try {
            localStorage.setItem(DAILY_DONE_KEY, puzzle?.date ?? '');
          } catch { /* storage unavailable */ }
        }
      } catch { /* network failure, the solve is still visible locally */ }
    })();
  }, [state, hintsUsed, elapsed, puzzle, game.moveCount]);

  return {
    ...game,
    load,
    puzzle,
    alreadyDone,
    completion,
    restart,
  };
}
