/**
 * Decides whether a position can still be won, and what to play next when it can.
 *
 * Runs in the browser between two taps, so every choice here trades completeness for a
 * bounded answer. It is deliberately not on the correctness path: levels are solvable by
 * construction at generation time, so a bug here can make a hint wrong or absent but can
 * never produce an unsolvable level.
 */

import type { Board, Tube } from './board';
import { topColour, topRunLength, isUniform } from './board';
import { applyMove, isSolved, legalMoves, type Move } from './rules';

/**
 * Three answers, not two.
 *
 * `dead` is a claim that the search exhausted every reachable position. `unknown` is the
 * absence of a claim. Collapsing them would mean telling a player their winnable position
 * is lost, which is worse than saying nothing — so they stay distinct in the type.
 */
export type Verdict = 'winnable' | 'dead' | 'unknown';

export interface SolveBudget {
  /** Positions examined before giving up. */
  readonly maxNodes: number;
  /** Wall clock milliseconds before giving up. */
  readonly maxMillis: number;
}

/**
 * Runs after every move, so it has to be cheap.
 *
 * Measured on real campaign boards, opening and mid-game, from level 1 to 200: every one
 * decided in under 200 positions and about a millisecond, because ordering moves by
 * "completes a colour" first finds a path almost immediately. The budget below is two
 * orders of magnitude above that, which is deliberate — it costs nothing on ordinary
 * boards and leaves room for a pathological one to still get an answer.
 */
export const AFTER_EACH_MOVE: SolveBudget = { maxNodes: 60_000, maxMillis: 45 };

/** A deliberate request, so it can afford more than the passive check. */
export const ON_REQUEST: SolveBudget = { maxNodes: 400_000, maxMillis: 350 };

export interface SolveResult {
  readonly verdict: Verdict;
  /** The next move on a winning path. Present only when the verdict is winnable. */
  readonly move: Move | null;
  /**
   * The whole winning sequence, first move first. Empty unless the verdict is winnable.
   *
   * Callers that hint repeatedly should follow this rather than asking again after every
   * move: each search is independent and may return a different, equally valid path, and
   * two such paths can undo one another indefinitely.
   */
  readonly path: readonly Move[];
  readonly nodesExamined: number;
  /** Unique board positions reached during the search (including the start). */
  readonly positionsReached: number;
}

/**
 * Tube order carries no meaning, so two boards differing only in arrangement are one
 * position. Folding them together is the difference between a search that finishes and one
 * that does not.
 *
 * The key is exact rather than hashed: a hash collision would prune a real solution and
 * turn a winnable position into a false `dead`.
 */
export function canonicalKey(board: Board): string {
  return board.tubes
    .map((tube) => tube.join(','))
    .sort()
    .join('|');
}

/** Moving a whole single-colour tube onto an empty one is legal but pure relabelling. */
function isPureRelabel(board: Board, move: Move): boolean {
  const source = board.tubes[move.from];
  return isUniform(source) && board.tubes[move.to].length === 0;
}

/**
 * Tried in the order most likely to reach a solution soonest. Pouring into an empty tube is
 * the move most often available and least often useful, so it goes last — trying it first
 * buries the search in shuffling that achieves nothing.
 */
function orderedMoves(board: Board, previous: Move | null): Move[] {
  const scored: { move: Move; rank: number }[] = [];

  for (const move of legalMoves(board)) {
    // The immediate inverse just undoes progress.
    if (previous !== null && move.from === previous.to && move.to === previous.from) {
      continue;
    }
    if (isPureRelabel(board, move)) {
      continue;
    }

    const source: Tube = board.tubes[move.from];
    const destination: Tube = board.tubes[move.to];
    const moving = Math.min(topRunLength(source), board.capacity - destination.length);

    let rank = 2;
    if (destination.length > 0) {
      // Completing a colour outright is always worth trying first.
      rank = destination.length + moving === board.capacity && isUniform(destination) ? 0 : 1;
    }

    scored.push({ move, rank });
  }

  scored.sort((a, b) => a.rank - b.rank);
  return scored.map((s) => s.move);
}

interface Frame {
  readonly board: Board;
  readonly moves: Move[];
  index: number;
  readonly previous: Move | null;
}

/**
 * Iterative depth-first search with an explicit stack.
 *
 * Iterative rather than recursive on purpose: solutions run to a few hundred moves and a
 * blown call stack in a browser tab is unrecoverable. Depth-first rather than breadth-first
 * because a hint needs *a* solution, not the shortest one, and breadth-first would hold the
 * whole frontier in memory on a phone to buy optimality nobody asked for.
 */
export function solve(
  board: Board,
  budget: SolveBudget = ON_REQUEST,
  /**
   * The move that produced this position, if any. Its inverse is pruned at the root as
   * well as deeper down — without this, a search started right after a move is free to
   * suggest undoing it, and a player following hints one at a time oscillates forever.
   */
  previous: Move | null = null,
): SolveResult {
  if (isSolved(board)) {
    return { verdict: 'winnable', move: null, path: [], nodesExamined: 0, positionsReached: 1 };
  }

  const deadline = Date.now() + budget.maxMillis;
  const visited = new Set<string>([canonicalKey(board)]);
  const stack: Frame[] = [
    { board, moves: orderedMoves(board, previous), index: 0, previous },
  ];

  let nodes = 0;
  let exhausted = true;

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];

    if (frame.index >= frame.moves.length) {
      stack.pop();
      continue;
    }

    const move = frame.moves[frame.index];
    frame.index++;

    const applied = applyMove(frame.board, move);
    if (applied === null) {
      continue;
    }

    nodes++;

    // Checked here rather than per iteration so the cost lands once per position examined.
    if (nodes >= budget.maxNodes || (nodes % 512 === 0 && Date.now() > deadline)) {
      exhausted = false;
      break;
    }

    if (isSolved(applied.board)) {
      // Every frame's current move, root first, is the winning sequence.
      const path = stack.map((f) => f.moves[f.index - 1]);
      return { verdict: 'winnable', move: path[0], path, nodesExamined: nodes, positionsReached: visited.size };
    }

    const key = canonicalKey(applied.board);
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    stack.push({
      board: applied.board,
      moves: orderedMoves(applied.board, move),
      index: 0,
      previous: move,
    });
  }

  // Exhausting the stack means every reachable position was examined and none was solved.
  // Stopping on the budget means nothing has been established.
  return {
    verdict: exhausted ? 'dead' : 'unknown',
    move: null,
    path: [],
    nodesExamined: nodes,
    positionsReached: visited.size,
  };
}

/**
 * The next move on a winning path, or null when the position cannot be won or the search
 * could not decide.
 */
export function hint(
  board: Board,
  budget: SolveBudget = ON_REQUEST,
  previous: Move | null = null,
): Move | null {
  return solve(board, budget, previous).move;
}

/** Convenience for the interface: is this position definitely lost? */
export function isDead(board: Board, budget: SolveBudget = AFTER_EACH_MOVE): boolean {
  return solve(board, budget).verdict === 'dead';
}

export { topColour };
