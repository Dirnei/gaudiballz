import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveTap } from './resolveTap';
import { useElapsedTime } from '../useElapsedTime';
import {
  HINT_COOLDOWN_MS,
  canHint as canHintBudget,
  canUndo as canUndoBudget,
  restartLevel,
  spendHint,
  spendUndo,
  startLevel,
  type Attempt,
} from '../attempt';
import {
  AFTER_EACH_MOVE,
  ON_REQUEST,
  legalMoves,
  canUndo as canUndoState,
  isLegal,
  isSolved,
  play,
  playGroup,
  restart as restartState,
  solve,
  startGame,
  undo as undoState,
  type Board,
  type GameState,
  type Move,
} from '../../engine';

export interface BoardPlayOptions {
  /** The board to play, or null while one is loading. A new board starts a fresh game. */
  readonly board: Board | null;
  /**
   * Changes when a new attempt begins (a level is opened or reopened). Resets selection,
   * budgets, cooldown and timer. Kept apart from `board` because the campaign arms the hint
   * cooldown the moment a level is opened, before its board has arrived.
   */
  readonly resetKey: unknown;
  /** Called for every move the player (or a hint) makes. */
  readonly onMove?: () => void;
}

/**
 * Board interaction shared by every play mode: what is picked up, pouring, undo, hints and
 * their cooldown, stuck detection and the timer. The modes wrap this with whatever is theirs
 * alone - loading, submission, overlays - and never re-implement any of it, which is what let
 * the three copies this replaced drift apart.
 */
export function useBoardPlay({ board, resetKey, onMove }: BoardPlayOptions) {
  const [state, setState] = useState<GameState | null>(null);
  /** The picked-up tubes, in the order they were picked, which is also the pour order. */
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempt, setAttempt] = useState<Attempt>(startLevel);

  /**
   * When the current hint cooldown ends, as a Date.now() target, or null when no wait is
   * running.
   *
   * A target rather than a countdown on purpose: browsers throttle timers in background
   * tabs, so anything counting elapsed ticks would drift. A wall-clock target is still
   * correct when the tab comes back, however badly the timer was starved.
   */
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [hinted, setHinted] = useState<Move | null>(null);

  /**
   * The remaining moves of a winning line, kept between hints.
   *
   * Recomputing after every hint is what caused hints to cycle: each search is independent
   * and may return a different, equally valid line, so hint N and hint N+1 could undo one
   * another forever. Following one plan removes that entirely; it is only recomputed when
   * the player deviates from it.
   */
  const plan = useRef<Move[]>([]);
  const undosUsed = useRef(0);
  const totalMoves = useRef(0);
  const elapsed = useElapsedTime();

  // Read through a ref so a mode passing a fresh closure every render costs nothing.
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    setSelected([]);
    setHintsUsed(0);
    setHinted(null);
    setAttempt(startLevel());
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);
    plan.current = [];
    undosUsed.current = 0;
    totalMoves.current = 0;
    elapsed.reset();
  }, [resetKey]);

  // A new board starts a new game during the same render, so there is never a frame where the
  // mode says "ready" but the board has nothing to show.
  const [origin, setOrigin] = useState<Board | null>(null);
  if (board !== origin) {
    setOrigin(board);
    setState(board === null ? null : startGame(board));
    setSelected([]);
  }

  /** Records accepted moves made by the player: one, or a multi-pour's several. */
  const moved = useCallback((next: GameState, count: number) => {
    // The player moved for themselves; whatever line was planned no longer applies.
    plan.current = [];
    totalMoves.current += count;
    for (let i = 0; i < count; i++) {
      onMoveRef.current?.();
    }
    setState(next);
    setSelected([]);
  }, []);

  /**
   * Tap to pick up, tap again to pour. The same gesture works under touch and mouse, which
   * drag-and-drop does not on a small screen. What a tap means - pick up, add to what is
   * picked up, pour, or put down - is decided by `resolveTap`.
   */
  const tapTube = useCallback(
    (index: number) => {
      if (state === null) {
        return;
      }

      const outcome = resolveTap(state.board, selected, index);
      if (outcome.kind === 'select') {
        setSelected(outcome.selected);
        return;
      }

      const next = outcome.moves.length === 1
        ? play(state, outcome.moves[0])
        : playGroup(state, outcome.moves);
      if (next !== state) {
        moved(next, outcome.moves.length);
      }
    },
    [state, selected, moved],
  );

  const pour = useCallback(
    (from: number, to: number) => {
      if (state === null) return;
      const next = play(state, { from, to });
      if (next !== state) {
        moved(next, 1);
      }
    },
    [state, moved],
  );

  const clearSelection = useCallback(() => setSelected([]), []);

  /**
   * Whether the position can still be won, recomputed after every move.
   *
   * Measured at well under a millisecond on every campaign board, so this runs inline
   * rather than being deferred. An undecided search reports `unknown`, which the interface
   * must never render as lost.
   */
  const noMoves = useMemo(
    () => state !== null && !isSolved(state.board) && legalMoves(state.board).length === 0,
    [state],
  );

  const dead = useMemo(() => {
    if (state === null || noMoves || isSolved(state.board)) return false;
    const result = solve(state.board, AFTER_EACH_MOVE);
    return result.verdict === 'dead' && result.positionsReached <= 2;
  }, [state, noMoves]);

  useEffect(() => {
    if (state === null) {
      return;
    }
    if (isSolved(state.board)) {
      elapsed.stop();
    } else if (selected.length > 0 || totalMoves.current > 0) {
      elapsed.start();
    }
  }, [state, selected, elapsed]);

  /** Asks for the next move on a winning line and plays it. Free, and never rationed. */
  const useHint = useCallback(() => {
    if (state === null) {
      return;
    }

    // Budget first: when it is gone the cooldown is irrelevant, and checking it first keeps
    // the two limits from having to know about each other.
    if (!canHintBudget(attempt) || cooldownEnd !== null) {
      return;
    }

    // Follow the existing plan while it still fits the board; only search again once the
    // player has moved somewhere it does not account for.
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
        setSelected([]);
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
    setSelected([]);
    setHintsUsed((n) => n + 1);
    setAttempt(spendHint(attempt));
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);

    const next = play(state, suggestion);
    if (next !== state) {
      totalMoves.current += 1;
      onMoveRef.current?.();
      setState(next);
    }

    // The highlight is a flourish, not state the game depends on.
    setTimeout(() => setHinted(null), 700);
  }, [state, attempt, cooldownEnd]);

  const undo = useCallback(() => {
    if (!canUndoBudget(attempt)) {
      return;
    }

    setSelected([]);
    setHinted(null);
    plan.current = [];
    undosUsed.current += 1;
    setAttempt(spendUndo(attempt));
    setState((current) => (current === null ? current : undoState(current)));
  }, [attempt]);

  /**
   * Clears the cooldown when its moment arrives.
   *
   * Re-armed whenever the target moves, and the remaining time is measured against the
   * clock rather than assumed to be the full duration, so a target set in the past expires
   * immediately instead of waiting all over again.
   */
  useEffect(() => {
    if (cooldownEnd === null) {
      return undefined;
    }

    // Never below zero, and never cleared synchronously: a target already in the past still
    // goes through the timer, one tick later, rather than setting state during the effect.
    const remaining = Math.max(0, cooldownEnd - Date.now());

    const timer = setTimeout(() => setCooldownEnd(null), remaining);
    return () => clearTimeout(timer);
  }, [cooldownEnd]);

  /** Back to the starting board with a fresh attempt's budgets. */
  const restart = useCallback(() => {
    setSelected([]);
    setHinted(null);
    plan.current = [];
    setAttempt(restartLevel());
    setHintsUsed(0);
    undosUsed.current = 0;
    totalMoves.current = 0;
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);
    elapsed.reset();
    setState((current) => (current === null ? current : restartState(current)));
  }, [elapsed]);

  return {
    state,
    board: state?.board ?? null,
    selected,
    solved: state !== null && isSolved(state.board),
    stuck: noMoves || dead,
    undosRemaining: attempt.undosRemaining,
    hintsRemaining: attempt.hintsRemaining,
    hintCooldownEnd: cooldownEnd,
    canHint:
      state !== null && !isSolved(state.board) && canHintBudget(attempt)
      && cooldownEnd === null
      && (!noMoves || canUndoState(state)),
    hintsUsed,
    hinted,
    useHint,
    canUndo: state !== null && canUndoState(state) && canUndoBudget(attempt),
    moveCount: totalMoves.current,
    undosUsed: undosUsed.current,
    elapsed,
    tapTube,
    pour,
    clearSelection,
    undo,
    restart,
  };
}

export type BoardPlay = ReturnType<typeof useBoardPlay>;
