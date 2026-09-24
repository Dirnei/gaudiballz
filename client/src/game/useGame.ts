import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBoardPlay } from './board/useBoardPlay';
import { ensureIdentity, forgetIdentity, remember, type Identity } from './identity';
import { loadAchievements, type AchievementState } from './achievements';
import { loadBallUnlocks, setProfileBall, type BallUnlock } from './profileBall';
import { newAttemptId } from './attempt';
import { ceilingFor, forgetUnlocked, readUnlocked, rememberUnlocked } from './ceiling';
import {
  drain, flushAndClear, loadProgress, mergeIntoAccount, recordCompletion, reportAttemptEnded,
  type NewAchievement, type NewBadge, type Progress, type RankUpEvent,
} from './progress';
import { createBoard, isSolved, type Board } from '../engine';

/**
 * The campaign around the shared board: the level lifecycle, loading boards from the server,
 * progression and the account. How the board itself is played lives in `useBoardPlay`.
 */

export interface LevelInfo {
  readonly levelId: number;
  readonly parMoves: number;
  readonly timeTargetMs: number;
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
  timeTargetMs: number;
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
): Map<number, { moves: number; hints: number; stars: number; points: number }> {
  const map = new Map<number, { moves: number; hints: number; stars: number; points: number }>();
  if (progress === null) {
    return map;
  }
  for (const entry of progress.levels) {
    map.set(entry.level, { moves: entry.moves, hints: entry.hints, stars: entry.stars, points: entry.points });
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
  const [achievements, setAchievements] = useState<AchievementState | null>(null);
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

  const [board, setBoard] = useState<Board | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [info, setInfo] = useState<LevelInfo | null>(null);
  const [levelCode, setLevelCode] = useState<string | null>(null);
  const [load, setLoad] = useState<LoadState>('loading');
  const [unlockedLevel, setUnlockedLevel] = useState(readUnlocked);

  const levelCeiling = ceilingFor(progress?.highestCompleted ?? null, unlockedLevel);

  /** Per-level completion data for the level select grid. O(1) lookup by level number. */
  const levelProgress = useMemo(() => buildLevelProgress(progress), [progress]);

  const restartedLevels = useRef(new Set<number>());

  /**
   * Identifies the attempt currently being played.
   *
   * The server counts an attempt once per id, which is what lets a departure be reported
   * twice — by the player confirming it and by the closing tab's beacon — without charging
   * two losses.
   *
   * `attemptOpen` says whether there is anything to lose. It goes true on the first move
   * rather than when the level loads, so opening a board to look at it and backing out costs
   * nothing, and goes false the moment the board is solved.
   */
  const attemptId = useRef(newAttemptId());
  const [attemptOpen, setAttemptOpen] = useState(false);

  /** Marks the attempt as begun. Called on every move; only the first one matters. */
  const beginAttempt = useCallback(() => setAttemptOpen(true), []);
  const [colourCount, setColourCount] = useState(0);
  const [newAchievements, setNewAchievements] = useState<NewAchievement[]>([]);
  const [newBadges, setNewBadges] = useState<NewBadge[]>([]);
  const [attemptStars, setAttemptStars] = useState(0);
  const [attemptPoints, setAttemptPoints] = useState(0);
  const [starDelta, setStarDelta] = useState(0);
  const [replayBonus, setReplayBonus] = useState(0);
  const [timeBonus, setTimeBonus] = useState(0);
  const [noHintBonus, setNoHintBonus] = useState(0);
  const [firstClearBonus, setFirstClearBonus] = useState(0);
  const [streakBonus, setStreakBonus] = useState(0);
  const [rankUp, setRankUp] = useState<RankUpEvent | null>(null);

  const game = useBoardPlay({ board, resetKey: `${levelId}:${loadKey}`, onMove: beginAttempt });
  const { state, elapsed, hintsUsed } = game;

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
    restartedLevels.current.delete(levelId);
    attemptId.current = newAttemptId();
    setAttemptOpen(false);
    setAttemptStars(0);
    setAttemptPoints(0);
    setStarDelta(0);
    setReplayBonus(0);
    setTimeBonus(0);

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
        setBoard(createBoard(level.tubes, level.capacity, level.colourCount));
        setColourCount(level.colourCount);
        setInfo({
          levelId: level.levelId,
          parMoves: level.parMoves,
          timeTargetMs: level.timeTargetMs,
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
  }, [levelId, loadKey]);

  const restartBoard = game.restart;
  const restart = useCallback(() => {
    restartBoard();
    restartedLevels.current.add(levelId);
    // Only an attempt that was actually played is lost by restarting; wiping an untouched
    // board throws nothing away.
    if (attemptOpen) {
      reportAttemptEnded(levelId, attemptId.current, 'restarted');
    }
    attemptId.current = newAttemptId();
    setAttemptOpen(false);
    setAttemptStars(0);
    setAttemptPoints(0);
    setStarDelta(0);
    setReplayBonus(0);
    setTimeBonus(0);
    setNoHintBonus(0);
    setFirstClearBonus(0);
    setStreakBonus(0);
    setRankUp(null);
  }, [levelId, attemptOpen, restartBoard]);

  /**
   * Records a completion once per solved attempt.
   *
   * The queue is written before the network is touched, so a failed, slow, or interrupted
   * request leaves the work waiting rather than losing it.
   */
  const recorded = useRef<string | null>(null);

  /**
   * Ends the current attempt as a loss, for a player who is leaving the level unfinished.
   *
   * Safe to call twice — the confirmed departure and the unload beacon both land on the same
   * attempt id, and the server counts an id once. Closing the attempt locally as well stops
   * the modal reappearing on the way out.
   */
  const abandonAttempt = useCallback((options: { beacon?: boolean } = {}) => {
    if (!attemptOpen) return;
    reportAttemptEnded(levelId, attemptId.current, 'abandoned', options);
    setAttemptOpen(false);
  }, [attemptOpen, levelId]);
  useEffect(() => {
    if (state === null || !isSolved(state.board)) {
      return;
    }

    const attempt = `${levelId}:${game.moveCount}:${hintsUsed}`;
    if (recorded.current === attempt) {
      return;
    }
    recorded.current = attempt;
    // Solved, so there is no longer an attempt to abandon.
    setAttemptOpen(false);

    void (async () => {
      const result = await recordCompletion(levelId, game.moveCount, hintsUsed, {
        elapsedTimeMs: elapsed.elapsedMs(),
        undoCount: game.undosUsed,
        restarted: restartedLevels.current.has(levelId),
        attemptId: attemptId.current,
        colourCount,
        parMoves: info?.parMoves ?? 0,
      });
      if (result.newAchievements.length > 0) {
        setNewAchievements(result.newAchievements);
      }
      if (result.newBadges.length > 0) {
        setNewBadges(result.newBadges);
      }
      setAttemptStars(result.attemptStars);
      setAttemptPoints(result.attemptPoints);
      setStarDelta(result.starDelta);
      setReplayBonus(result.replayBonus);
      setTimeBonus(result.timeBonus);
      setNoHintBonus(result.noHintBonus);
      setFirstClearBonus(result.firstClearBonus);
      setStreakBonus(result.streakBonus);
      setRankUp(result.rankUp);
      const refreshed = await loadProgress();
      if (refreshed !== null) {
        setProgress(refreshed);
      }

      setUnlockedLevel(rememberUnlocked(levelId + 1));
    })();
  }, [state, levelId, hintsUsed, colourCount, info, game.moveCount, game.undosUsed, elapsed]);

  const goToLevel = useCallback((next: number) => {
    const clamped = Math.max(1, next);
    if (clamped > levelCeiling) {
      return;
    }
    setBoard(null);
    setLevelId(clamped);
    setLoadKey((k) => k + 1);
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

  const emailChanged = useCallback((email: string | null, verified: boolean) => {
    setIdentity((current) =>
      current === null ? current : { ...current, email, emailVerified: verified });
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

  const ensureAchievements = useCallback(async () => {
    const loaded = await loadAchievements();
    setAchievements(loaded);
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

  const clearNewAchievements = useCallback(() => setNewAchievements([]), []);

  return {
    levelId,
    levelCode,
    attemptId: attemptId.current,
    attemptOpen,
    abandonAttempt,
    levelCeiling,
    levelProgress,
    info,
    load,
    state,
    selected: game.selected,
    identity,
    progress,
    loggedIn: signedIn,
    logOut: signOut,
    registered,
    emailChanged,
    unlockWithCode,
    ballUnlocks,
    ensureBallUnlocks,
    achievements,
    ensureAchievements,
    chooseBall,
    solved: game.solved,
    stuck: game.stuck,
    undosRemaining: game.undosRemaining,
    hintsRemaining: game.hintsRemaining,
    hintCooldownEnd: game.hintCooldownEnd,
    canHint: game.canHint,
    hintsUsed,
    hinted: game.hinted,
    useHint: game.useHint,
    canUndo: game.canUndo,
    moveCount: game.moveCount,
    attemptStars,
    attemptPoints,
    starDelta,
    replayBonus,
    timeBonus,
    noHintBonus,
    firstClearBonus,
    streakBonus,
    rankUp,
    newAchievements,
    newBadges,
    clearNewAchievements,
    elapsed,
    tapTube: game.tapTube,
    pour: game.pour,
    clearSelection: game.clearSelection,
    undo: game.undo,
    restart,
    goToLevel,
  };
}
