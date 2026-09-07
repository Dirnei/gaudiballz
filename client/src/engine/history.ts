/**
 * Undo, which is a client-only concern.
 *
 * The server never sees it: a completed puzzle is submitted as the net list of accepted
 * moves, so undo has no counterpart in the shared rules and no fixtures. Keeping it here
 * rather than in the rules keeps the cross-language surface as small as possible.
 */

import type { Board } from './board';
import { applyMove, type Move } from './rules';

export interface GameState {
  readonly board: Board;
  /** Moves that survived undo, in order. This is what gets submitted. */
  readonly moves: readonly Move[];
  /** Boards before each accepted move, so undo is a pop rather than a replay. */
  readonly history: readonly Board[];
}

export function startGame(board: Board): GameState {
  return { board, moves: [], history: [] };
}

/** Returns the same state when the move is illegal, so callers can compare identity. */
export function play(state: GameState, move: Move): GameState {
  const result = applyMove(state.board, move);
  if (result === null) {
    return state;
  }

  return {
    board: result.board,
    moves: [...state.moves, move],
    history: [...state.history, state.board],
  };
}

export function canUndo(state: GameState): boolean {
  return state.history.length > 0;
}

export function undo(state: GameState): GameState {
  if (state.history.length === 0) {
    return state;
  }

  return {
    board: state.history[state.history.length - 1],
    moves: state.moves.slice(0, -1),
    history: state.history.slice(0, -1),
  };
}

export function restart(state: GameState): GameState {
  return startGame(state.history.length > 0 ? state.history[0] : state.board);
}
