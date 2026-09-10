import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useElapsedTime } from './useElapsedTime';
import { API, authHeaders } from './identity';
import {
  HINT_COOLDOWN_MS,
  canHint as canHintBudget,
  canUndo as canUndoBudget,
  restartLevel,
  spendHint,
  spendUndo,
  startLevel,
  type Attempt,
} from './attempt';
import {
  AFTER_EACH_MOVE,
  ON_REQUEST,
  legalMoves,
  canUndo as canUndoState,
  createBoard,
  isLegal,
  isSolved,
  play,
  restart as restartState,
  solve,
  startGame,
  undo as undoState,
  type Board,
  type GameState,
  type Move,
} from '../engine';

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
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempt, setAttempt] = useState<Attempt>(startLevel);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [hinted, setHinted] = useState<{ from: number; to: number } | null>(null);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(isDailyDoneToday);

  const plan = useRef<Move[]>([]);
  const elapsed = useElapsedTime();

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
        const board: Board = createBoard(data.tubes, data.capacity, data.colourCount);
        setPuzzle(data);
        setState(startGame(board));
        setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);
        setLoad('ready');
      })
      .catch(() => {
        if (!cancelled) setLoad('error');
      });

    return () => { cancelled = true; };
  }, []);

  const board = state?.board ?? null;
  const solved = state !== null && isSolved(state.board);

  const noMoves = useMemo(
    () => state !== null && !isSolved(state.board) && legalMoves(state.board).length === 0,
    [state],
  );

  const dead = useMemo(() => {
    if (state === null || noMoves || isSolved(state.board)) return false;
    const result = solve(state.board, AFTER_EACH_MOVE);
    return result.verdict === 'dead' && result.positionsReached <= 2;
  }, [state, noMoves]);

  const stuck = noMoves || dead;

  /** Start / stop timer based on game state. */
  useEffect(() => {
    if (state === null) return;
    if (isSolved(state.board)) {
      elapsed.stop();
    } else if (selected !== null || state.moves.length > 0) {
      elapsed.start();
    }
  }, [state, selected, elapsed]);

  /** Clear cooldown when time arrives. */
  useEffect(() => {
    if (cooldownEnd === null) return undefined;
    const remaining = Math.max(0, cooldownEnd - Date.now());
    const timer = setTimeout(() => setCooldownEnd(null), remaining);
    return () => clearTimeout(timer);
  }, [cooldownEnd]);

  const tapTube = useCallback(
    (index: number) => {
      if (state === null) return;

      if (selected === null) {
        if (state.board.tubes[index].length > 0) setSelected(index);
        return;
      }

      if (selected === index) {
        setSelected(null);
        return;
      }

      const next = play(state, { from: selected, to: index });
      if (next !== state) {
        plan.current = [];
        setState(next);
        setSelected(null);
      } else {
        setSelected(state.board.tubes[index].length > 0 ? index : null);
      }
    },
    [state, selected],
  );

  const pour = useCallback(
    (from: number, to: number) => {
      if (state === null) return;
      const next = play(state, { from, to });
      if (next !== state) {
        plan.current = [];
        setState(next);
        setSelected(null);
      }
    },
    [state],
  );

  const useHint = useCallback(() => {
    if (state === null) return;
    if (!canHintBudget(attempt) || cooldownEnd !== null) return;

    let planned: Move | null = plan.current[0] ?? null;
    if (planned === null || !isLegal(state.board, planned)) {
      const found = solve(state.board, ON_REQUEST);
      plan.current = [...found.path];
      planned = plan.current[0] ?? null;
    }

    if (planned === null) {
      const fallback = legalMoves(state.board)[0] ?? null;
      if (fallback !== null) {
        planned = fallback;
      } else if (canUndoState(state)) {
        setSelected(null);
        setHinted(null);
        plan.current = [];
        setAttempt(spendHint(attempt));
        setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);
        setState(undoState(state));
        return;
      } else {
        return;
      }
    }

    const suggestion = planned;
    plan.current = plan.current.slice(1);

    setHinted(suggestion);
    setSelected(null);
    setHintsUsed((n) => n + 1);
    setAttempt(spendHint(attempt));
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);

    const next = play(state, suggestion);
    if (next !== state) setState(next);

    setTimeout(() => setHinted(null), 700);
  }, [state, attempt, cooldownEnd]);

  const undo = useCallback(() => {
    if (!canUndoBudget(attempt)) return;
    setSelected(null);
    setHinted(null);
    plan.current = [];
    setAttempt(spendUndo(attempt));
    setState((current) => (current === null ? current : undoState(current)));
  }, [attempt]);

  const restart = useCallback(() => {
    setSelected(null);
    setHinted(null);
    plan.current = [];
    setAttempt(restartLevel());
    setHintsUsed(0);
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);
    elapsed.reset();
    setCompletion(null);
    setState((current) => (current === null ? current : restartState(current)));
  }, [elapsed]);

  /** Record completion once per solved attempt. */
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (state === null || !isSolved(state.board)) return;

    const key = `${state.moves.length}:${hintsUsed}`;
    if (recorded.current === key) return;
    recorded.current = key;

    void (async () => {
      try {
        const res = await fetch(`${API}/api/v1/daily/completions`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            moves: state.moves.length,
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
  }, [state, hintsUsed, elapsed, puzzle]);

  return {
    load,
    puzzle,
    board,
    state,
    selected,
    solved,
    stuck,
    alreadyDone,
    completion,
    elapsed,
    moveCount: state?.moves.length ?? 0,
    hintsUsed,
    undosRemaining: attempt.undosRemaining,
    hintsRemaining: attempt.hintsRemaining,
    hintCooldownEnd: cooldownEnd,
    canHint:
      state !== null && !isSolved(state.board) && canHintBudget(attempt)
      && cooldownEnd === null
      && (!noMoves || canUndoState(state)),
    canUndo: state !== null && canUndoState(state) && canUndoBudget(attempt),
    hinted,
    tapTube,
    pour,
    useHint,
    undo,
    restart,
  };
}
