import { useCallback, useEffect, useState } from 'react';
import {
  canUndo as canUndoState,
  createBoard,
  isSolved,
  play,
  restart as restartState,
  startGame,
  undo as undoState,
  type Board,
  type GameState,
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
 * Default to the host the page came from, on the API port. Hardcoding localhost would
 * work on this machine and fail on a phone opening the same dev server over the network,
 * which is exactly where the game needs testing.
 */
const API =
  import.meta.env['VITE_API_URL'] ??
  `${window.location.protocol}//${window.location.hostname}:5199`;
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

  useEffect(() => {
    let cancelled = false;
    setLoad('loading');
    setSelected(null);

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

  const undo = useCallback(() => {
    setSelected(null);
    setState((current) => (current === null ? current : undoState(current)));
  }, []);

  const restart = useCallback(() => {
    setSelected(null);
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
    canUndo: state !== null && canUndoState(state),
    moveCount: state?.moves.length ?? 0,
    tapTube,
    undo,
    restart,
    goToLevel,
  };
}
