import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AFTER_EACH_MOVE,
  ON_REQUEST,
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
  type Verdict,
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
}

/**
 * Where the API lives.
 *
 * In a container the server serves the client too, so the API is same-origin and the
 * prefix is empty. In development the client runs on its own Vite port, so it needs the
 * host the page came from plus the API port - the host rather than localhost, because the
 * game is mostly tested from a phone on the same network.
 */
const API =
  import.meta.env['VITE_API_URL'] ??
  (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:5199` : '');
const LAST_LEVEL_KEY = 'puzzle.lastLevel';

export type LoadState = 'loading' | 'ready' | 'error';

export function useGame() {
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
  const [load, setLoad] = useState<LoadState>('loading');
  const [selected, setSelected] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hinted, setHinted] = useState<{ from: number; to: number } | null>(null);

  /**
   * The remaining moves of a winning line, kept between hints.
   *
   * Recomputing after every hint is what caused hints to cycle: each search is independent
   * and may return a different, equally valid line, so hint N and hint N+1 could undo one
   * another forever. Following one plan removes that entirely; it is only recomputed when
   * the player deviates from it.
   */
  const plan = useRef<Move[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoad('loading');
    setSelected(null);
    setHintsUsed(0);
    setHinted(null);
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
  const verdict: Verdict = useMemo(
    () => (state === null ? 'unknown' : solve(state.board, AFTER_EACH_MOVE).verdict),
    [state],
  );

  /** Asks for the next move on a winning line and plays it. Free, and never rationed. */
  const useHint = useCallback(() => {
    if (state === null) {
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

    const next = play(state, suggestion);
    if (next !== state) {
      setState(next);
    }

    // The highlight is a flourish, not state the game depends on.
    setTimeout(() => setHinted(null), 700);
  }, [state]);

  const undo = useCallback(() => {
    setSelected(null);
    setHinted(null);
    plan.current = [];
    setState((current) => (current === null ? current : undoState(current)));
  }, []);

  const restart = useCallback(() => {
    setSelected(null);
    setHinted(null);
    plan.current = [];
    setState((current) => (current === null ? current : restartState(current)));
  }, []);

  const goToLevel = useCallback((next: number) => {
    setLevelId(Math.max(1, next));
  }, []);

  return {
    levelId,
    info,
    load,
    state,
    selected,
    solved: state !== null && isSolved(state.board),
    // Only a proved verdict counts as lost; `unknown` must never surface as defeat.
    stuck: verdict === 'dead',
    hintsUsed,
    hinted,
    useHint,
    canUndo: state !== null && canUndoState(state),
    moveCount: state?.moves.length ?? 0,
    tapTube,
    undo,
    restart,
    goToLevel,
  };
}
