/**
 * The rules of the puzzle. Mirrors `RuleSetV1` in C#; the `sort-puzzle-rules` capability
 * spec is the arbiter and the conformance fixtures prove the two agree.
 */

import { type Board, type Colour, topColour, topRunLength, isUniform } from './board';

export interface Move {
  readonly from: number;
  readonly to: number;
}

/** Why a move was rejected. Names match the C# enum so fixtures are shared verbatim. */
export type MoveRejection =
  | 'None'
  | 'SameTube'
  | 'TubeOutOfRange'
  | 'SourceEmpty'
  | 'DestinationFull'
  | 'ColourMismatch';

/** The rule set version this engine implements. Submitted with every completed puzzle. */
export const RULES_VERSION = 1;

/** Requirement: Move legality. */
export function validate(board: Board, move: Move): MoveRejection {
  const { from, to } = move;

  if (from < 0 || to < 0 || from >= board.tubes.length || to >= board.tubes.length) {
    return 'TubeOutOfRange';
  }
  if (from === to) {
    return 'SameTube';
  }

  const source = board.tubes[from];
  if (source.length === 0) {
    return 'SourceEmpty';
  }

  const destination = board.tubes[to];
  if (destination.length >= board.capacity) {
    return 'DestinationFull';
  }

  // An empty destination accepts any colour. A move that merely relocates a single-colour
  // tube onto an empty one is legal but useless: the player's to avoid, not the rules' to
  // forbid.
  if (destination.length > 0 && topColour(destination) !== topColour(source)) {
    return 'ColourMismatch';
  }

  return 'None';
}

export function isLegal(board: Board, move: Move): boolean {
  return validate(board, move) === 'None';
}

export interface ApplyResult {
  readonly board: Board;
  readonly movedCount: number;
}

/**
 * Requirement: Pour amount.
 *
 * Returns null when the move is illegal, leaving the caller's board untouched.
 */
export function applyMove(board: Board, move: Move): ApplyResult | null {
  if (validate(board, move) !== 'None') {
    return null;
  }

  const source = board.tubes[move.from];
  const destination = board.tubes[move.to];

  // As many as fit: a pour that cannot take the whole run still moves what it can, and
  // the remainder stays behind. It is not rejected.
  const space = board.capacity - destination.length;
  const movedCount = Math.min(topRunLength(source), space);
  const colour: Colour = topColour(source);

  const tubes = board.tubes.map((tube, index) => {
    if (index === move.from) {
      return tube.slice(0, tube.length - movedCount);
    }
    if (index === move.to) {
      return [...tube, ...new Array<Colour>(movedCount).fill(colour)];
    }
    return tube;
  });

  return { board: { ...board, tubes }, movedCount };
}

/** Requirement: Move enumeration order — by source, then by destination. */
export function legalMoves(board: Board): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < board.tubes.length; from++) {
    for (let to = 0; to < board.tubes.length; to++) {
      const move = { from, to };
      if (validate(board, move) === 'None') {
        moves.push(move);
      }
    }
  }

  return moves;
}

/** Requirement: Win condition. */
export function isSolved(board: Board): boolean {
  return board.tubes.every((tube) => {
    if (tube.length === 0) {
      return true;
    }

    // Uniform is not enough. Without the fullness check, one colour split across two
    // uniform-but-partial tubes would read as solved.
    return isUniform(tube) && tube.length === board.capacity;
  });
}
