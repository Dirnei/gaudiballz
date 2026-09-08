import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureIdentity, forgetIdentity, remember, type Identity } from './identity';
import { loadBallUnlocks, setProfileBall, type BallUnlock } from './profileBall';
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
import { ceilingFor, forgetUnlocked, readUnlocked, rememberUnlocked } from './ceiling';
import { drain, flushAndClear, loadProgress, mergeIntoAccount, recordCompletion, type Progress } from './progress';
import {
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

/**
 * Binds the pure engine to the screen: which tube is picked up, the level lifecycle, and
 * loading boards from the server. The engine itself knows nothing about any of this.
 */

export interface LevelInfo {
  readonly levelId: number;
  readonly parMoves: number;
  readonly spareTubes: number;
  /** Set only when this level changes the rules of engagement. */
  readonly chapterNote: string | null;
}

interface LevelResponse {
  levelId: number;
  tubes: number[][];
  capacity: number;
  colourCount: number;
  parMoves: number;
  spareTubes: number;
  chapterNote: string | null;
  code: string;
}

/**
 * Where the API lives.
 *
 * In a container the server serves the client too, so the API is same-origin and the
 * prefix is empty. In development the client runs on its own Vite port, so it needs the
 * host the page came from plus the API port - the host rather than localhost, because the
 * game is mostly tested from a phone on the same network.
 */
import { API } from './identity';

const LAST_LEVEL_KEY = 'puzzle.lastLevel';

export type LoadState = 'loading' | 'ready' | 'error';

/** Converts the server's flat levels array into a Map for O(1) lookup per level. */
export function buildLevelProgress(
  progress: Progress | null,
): Map<number, { moves: number; hints: number }> {
  const map = new Map<number, { moves: number; hints: number }>();
  if (progress === null) {
    return map;
  }
  for (const entry of progress.levels) {
    map.set(entry.level, { moves: entry.moves, hints: entry.hints });
  }
  return map;
}

export function useGame() {
  const [identity, setIdentity] = useState<Identity | null>(null);

  /**
   * Which colour each ball is earned at. The same for every player and fixed for a build, so
   * it is fetched once and kept; the picker is the only thing that reads it.
   */
  const [ballUnlocks, setBallUnlocks] = useState<readonly BallUnlock[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  const [levelId, setLevelId] = useState(() => {
    // A convenience, not progress tracking - that arrives with the progression capability.
    try {
      const stored = localStorage.getItem(LAST_LEVEL_KEY);
      return stored === null ? 1 : Math.max(1, Number(stored) || 1);
    } catch {
      return 1;
    }
  });

  const [state, setState] = useState<GameState | null>(null);
  const [info, setInfo] = useState<LevelInfo | null>(null);
  const [levelCode, setLevelCode] = useState<string | null>(null);
  const [load, setLoad] = useState<LoadState>('loading');
  const [selected, setSelected] = useState<number | null>(null);
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
  const [hinted, setHinted] = useState<{ from: number; to: number } | null>(null);

  const [unlockedLevel, setUnlockedLevel] = useState(readUnlocked);

  const levelCeiling = ceilingFor(progress?.highestCompleted ?? null, unlockedLevel);

  /** Per-level completion data for the level select grid. O(1) lookup by level number. */
  const levelProgress = useMemo(() => buildLevelProgress(progress), [progress]);

  /**
   * The remaining moves of a winning line, kept between hints.
   *
   * Recomputing after every hint is what caused hints to cycle: each search is independent
   * and may return a different, equally valid line, so hint N and hint N+1 could undo one
   * another forever. Following one plan removes that entirely; it is only recomputed when
   * the player deviates from it.
   */
  const plan = useRef<Move[]>([]);

  /**
   * Identity and progress on launch. Silent: no form, no prompt, nothing to dismiss. If the
   * network is not there the game simply starts anyway and picks this up later.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const who = await ensureIdentity();
      if (cancelled) {
        return;
      }

      setIdentity(who);
      if (who === null) {
        return;
      }

      // Anything recorded while offline goes out now.
      await drain();

      const loaded = await loadProgress();
      if (cancelled || loaded === null) {
        return;
      }

      setProgress(loaded);
      // Remembered on the device, so a launch that cannot reach the server keeps the ceiling.
      setUnlockedLevel(rememberUnlocked(loaded.highestCompleted + 1));

      // Resume where the account got to, when that is further than this browser.
      setLevelId((current) =>
        loaded.highestCompleted + 1 > current ? loaded.highestCompleted + 1 : current);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoad('loading');
    setSelected(null);
    setHintsUsed(0);
    setHinted(null);
    setAttempt(startLevel());
    // A new board is the moment to look at it, so the first hint is not available yet.
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);
    plan.current = [];

    fetch(`${API}/api/v1/levels/${levelId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Level ${levelId} returned ${response.status}`);
        }
        return response.json() as Promise<LevelResponse>;
      })
      .then((level) => {
        if (cancelled) {
          return;
        }
        const board: Board = createBoard(level.tubes, level.capacity, level.colourCount);
        setState(startGame(board));
        setInfo({
          levelId: level.levelId,
          parMoves: level.parMoves,
          spareTubes: level.spareTubes,
          chapterNote: level.chapterNote,
        });
        setLevelCode(level.code);
        setLoad('ready');
        try {
          localStorage.setItem(LAST_LEVEL_KEY, String(levelId));
        } catch {
          // A private window or blocked storage is not a reason to fail the level.
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoad('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [levelId]);

  /**
   * Tap to pick up, tap again to pour. The same gesture works under touch and mouse, which
   * drag-and-drop does not on a small screen.
   */
  const tapTube = useCallback(
    (index: number) => {
      if (state === null) {
        return;
      }

      if (selected === null) {
        if (state.board.tubes[index].length > 0) {
          setSelected(index);
        }
        return;
      }

      if (selected === index) {
        setSelected(null);
        return;
      }

      const next = play(state, { from: selected, to: index });
      if (next !== state) {
        // The player moved for themselves; whatever line was planned no longer applies.
        plan.current = [];
        setState(next);
        setSelected(null);
      } else {
        // Illegal: treat the tap as picking up the new tube instead of doing nothing, so
        // a mis-tap never costs a second tap.
        setSelected(state.board.tubes[index].length > 0 ? index : null);
      }
    },
    [state, selected],
  );

  /**
   * Whether the position can still be won, recomputed after every move.
   *
   * Measured at well under a millisecond on every campaign board, so this runs inline
   * rather than being deferred. An undecided search reports `unknown`, which the interface
   * must never render as lost.
   */
  /**
   * Whether the board offers anything at all.
   *
   * The only thing the player is told about. A proved-unwinnable position with moves still
   * on it is deliberately left unannounced: saying so the moment it happens turns the puzzle
   * into trial and error with perfect feedback, and makes the undo budget pointless because
   * the move to undo is obvious. Nor is a repeated board pointed out — going round in a
   * circle is there on the board to see, and remarking on it reads as the game watching over
   * the player's shoulder.
   */
  const noMoves = useMemo(
    () => state !== null && !isSolved(state.board) && legalMoves(state.board).length === 0,
    [state],
  );

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
      return;
    }

    const suggestion = planned;

    plan.current = plan.current.slice(1);

    setHinted(suggestion);
    setSelected(null);
    setHintsUsed((n) => n + 1);
    setAttempt(spendHint(attempt));
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);

    const next = play(state, suggestion);
    if (next !== state) {
      setState(next);
    }

    // The highlight is a flourish, not state the game depends on.
    setTimeout(() => setHinted(null), 700);
  }, [state, attempt, cooldownEnd]);

  const undo = useCallback(() => {
    if (!canUndoBudget(attempt)) {
      return;
    }

    setSelected(null);
    setHinted(null);
    plan.current = [];
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

  const restart = useCallback(() => {
    setSelected(null);
    setHinted(null);
    plan.current = [];
    // A new attempt: the board, both budgets and the counts all start again.
    setAttempt(restartLevel());
    setHintsUsed(0);
    setCooldownEnd(Date.now() + HINT_COOLDOWN_MS);
    setState((current) => (current === null ? current : restartState(current)));
  }, []);

  /**
   * Records a completion once per solved attempt.
   *
   * The queue is written before the network is touched, so a failed, slow, or interrupted
   * request leaves the work waiting rather than losing it.
   */
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (state === null || !isSolved(state.board)) {
      return;
    }

    const attempt = `${levelId}:${state.moves.length}:${hintsUsed}`;
    if (recorded.current === attempt) {
      return;
    }
    recorded.current = attempt;

    void (async () => {
      await recordCompletion(levelId, state.moves.length, hintsUsed);
      const refreshed = await loadProgress();
      if (refreshed !== null) {
        setProgress(refreshed);
      }

      // The level just solved is finished whether or not the server could be told about it.
      setUnlockedLevel(rememberUnlocked(levelId + 1));
    })();
  }, [state, levelId, hintsUsed]);

  const goToLevel = useCallback((next: number) => {
    const clamped = Math.max(1, next);
    if (clamped > levelCeiling) {
      return;
    }
    setLevelId(clamped);
  }, [levelCeiling]);

  /**
   * Signing in on a device that has already played: this device's progress is folded into
   * the account rather than either side being discarded.
   */
  const signedIn = useCallback(async (who: Identity) => {
    remember(who);
    setIdentity(who);

    const local = progress?.levels ?? [];
    const merged = await mergeIntoAccount(local);
    if (merged !== null) {
      setProgress(merged);
      setLevelId((current) =>
        merged.highestCompleted + 1 > current ? merged.highestCompleted + 1 : current);
    }
  }, [progress]);

  /**
   * Leaves the account on this device and continues as someone new.
   *
   * Queued work is sent first and cleared either way, so nothing belonging to the account
   * being left can end up recorded against the next one. The account itself is untouched —
   * with a passkey it can be signed back in to; without one it simply becomes unreachable,
   * which is what the interface warns about beforehand.
   */
  const signOut = useCallback(async () => {
    await flushAndClear();
    forgetIdentity();

    setProgress(null);
    setIdentity(null);
    setLevelId(1);
    try {
      localStorage.removeItem(LAST_LEVEL_KEY);
    } catch {
      // Nothing to clear.
    }
    forgetUnlocked();
    setUnlockedLevel(0);

    // Straight back to playable, with nothing to dismiss.
    setIdentity(await ensureIdentity());
  }, []);

  const unlockWithCode = useCallback(async (code: string): Promise<{ levelId: number } | null> => {
    try {
      const response = await fetch(`${API}/api/v1/levels/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!response.ok) {
        return null;
      }
      const result = (await response.json()) as { levelId: number };
      setUnlockedLevel(rememberUnlocked(result.levelId));
      setLevelId(result.levelId);
      return result;
    } catch {
      return null;
    }
  }, []);

  const registered = useCallback((username: string) => {
    setIdentity((current) =>
      current === null ? current : { ...current, isAnonymous: false, username });
  }, []);

  /**
   * Fetches the unlock table, once, the first time anything needs it.
   *
   * Deliberately not on launch: a player who never opens the account panel never asks for
   * it, which keeps the game's startup to what playing actually requires.
   */
  const ensureBallUnlocks = useCallback(async () => {
    const unlocks = await loadBallUnlocks();
    setBallUnlocks(unlocks);
  }, []);

  /**
   * Saves the ball the player picked, or clears it with null.
   *
   * The identity is only updated once the server has taken it, so a refusal — a colour this
   * account has not earned — leaves the ball on screen exactly as it was.
   */
  const chooseBall = useCallback(async (colour: number | null): Promise<boolean> => {
    const saved = await setProfileBall(colour);
    if (saved) {
      setIdentity((current) => (current === null ? current : { ...current, ball: colour }));
    }

    return saved;
  }, []);

  return {
    levelId,
    levelCode,
    levelCeiling,
    levelProgress,
    info,
    load,
    state,
    selected,
    identity,
    progress,
    loggedIn: signedIn,
    logOut: signOut,
    registered,
    unlockWithCode,
    ballUnlocks,
    ensureBallUnlocks,
    chooseBall,
    solved: state !== null && isSolved(state.board),
    stuck: noMoves,
    undosRemaining: attempt.undosRemaining,
    hintsRemaining: attempt.hintsRemaining,
    hintCooldownEnd: cooldownEnd,
    canHint:
      state !== null && !noMoves && !isSolved(state.board) && canHintBudget(attempt)
      && cooldownEnd === null,
    hintsUsed,
    hinted,
    useHint,
    canUndo: state !== null && canUndoState(state) && canUndoBudget(attempt),
    moveCount: state?.moves.length ?? 0,
    tapTube,
    undo,
    restart,
    goToLevel,
  };
}
