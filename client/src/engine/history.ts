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
  /** Boards before each undo step, so undo is a pop rather than a replay. */
  readonly history: readonly Board[];
  /**
   * How many moves each undo step holds, parallel to `history`. Usually 1; a pour from
   * several picked-up tubes at once is one step of several moves, and undoes as one.
   */
  readonly steps: readonly number[];
}

export function startGame(board: Board): GameState {
  return { board, moves: [], history: [], steps: [] };
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
    steps: [...state.steps, 1],
  };
}

/**
 * Plays several moves as one undo step. All or nothing: if any move is illegal on the board
 * the earlier ones leave, the same state comes back and nothing is played.
 *
 * The moves are still recorded one by one, because that is what the server replays; only
 * undo sees them as a group.
 */
export function playGroup(state: GameState, moves: readonly Move[]): GameState {
  if (moves.length === 0) {
    return state;
  }

  let board = state.board;
  for (const move of moves) {
    const result = applyMove(board, move);
    if (result === null) {
      return state;
    }
    board = result.board;
  }

  return {
    board,
    moves: [...state.moves, ...moves],
    history: [...state.history, state.board],
    steps: [...state.steps, moves.length],
  };
}

export function canUndo(state: GameState): boolean {
  return state.history.length > 0;
}

export function undo(state: GameState): GameState {
  if (state.history.length === 0) {
    return state;
  }

  const size = state.steps[state.steps.length - 1] ?? 1;
  return {
    board: state.history[state.history.length - 1],
    moves: state.moves.slice(0, state.moves.length - size),
    history: state.history.slice(0, -1),
    steps: state.steps.slice(0, -1),
  };
}

export function restart(state: GameState): GameState {
  return startGame(state.history.length > 0 ? state.history[0] : state.board);
}
