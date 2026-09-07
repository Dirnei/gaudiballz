import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBoard } from './board';
import { applyMove, isLegal, isSolved, type Move } from './rules';
import { ON_REQUEST, solve } from './solver';

/**
 * Regression: following hints must actually finish the level.
 *
 * The original hint-chain test used a small hand-built three-colour board, which was far
 * too forgiving. On real boards hints cycled forever — each search is independent and may
 * return a different, equally valid line, so one hint could undo the last one indefinitely.
 * These use committed generated levels, including the eight-colour capacity-six shape the
 * campaign uses from level 50.
 */
const inputs = JSON.parse(
  readFileSync(resolve(__dirname, '../../../conformance/v1/replay-inputs.json'), 'utf8'),
) as { id: string; board: { tubes: number[][]; capacity: number; colourCount: number } }[];

function boardOf(input: (typeof inputs)[number]) {
  return createBoard(input.board.tubes, input.board.capacity, input.board.colourCount);
}

describe('the winning line a search returns', () => {
  for (const input of inputs) {
    it(`${input.id}: replays to a solved board`, { timeout: 30_000 }, () => {
      const start = boardOf(input);
      const result = solve(start, ON_REQUEST);

      expect(result.verdict).toBe('winnable');
      expect(result.path.length).toBeGreaterThan(0);

      let board = start;
      result.path.forEach((move, i) => {
        const applied = applyMove(board, move);
        expect(applied, `move ${i} (${move.from}->${move.to}) was illegal`).not.toBeNull();
        board = applied!.board;
      });

      expect(isSolved(board)).toBe(true);
    });
  }
});

describe('following a plan, as the game does', () => {
  for (const input of inputs) {
    it(`${input.id}: reaches a solved board`, { timeout: 30_000 }, () => {
      let board = boardOf(input);
      let plan: Move[] = [];

      for (let step = 0; step < 500 && !isSolved(board); step++) {
        // Search again only when the plan no longer fits, which is what the game does.
        if (plan.length === 0 || !isLegal(board, plan[0])) {
          plan = [...solve(board, ON_REQUEST).path];
        }

        expect(plan.length, `${input.id}: no move available at step ${step}`).toBeGreaterThan(0);

        const move = plan[0];
        plan = plan.slice(1);

        const applied = applyMove(board, move);
        expect(applied).not.toBeNull();
        board = applied!.board;
      }

      expect(isSolved(board)).toBe(true);
    });
  }
});

describe('asking again after every move still terminates', () => {
  /**
   * The plan is the primary defence, but a caller that re-searches each time must not spin.
   * Passing the previous move prunes its inverse at the root, which is what stops the
   * simplest two-move oscillation.
   */
  for (const input of inputs.slice(0, 4)) {
    it(`${input.id}: does not cycle`, { timeout: 30_000 }, () => {
      let board = boardOf(input);
      let previous: Move | null = null;

      for (let step = 0; step < 500 && !isSolved(board); step++) {
        const move: Move | null = solve(board, ON_REQUEST, previous).move;
        expect(move, `${input.id}: hints ran out at step ${step}`).not.toBeNull();

        const applied = applyMove(board, move!);
        expect(applied).not.toBeNull();
        previous = move;
        board = applied!.board;
      }

      expect(isSolved(board)).toBe(true);
    });
  }
});
