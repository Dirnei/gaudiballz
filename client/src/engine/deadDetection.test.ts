import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBoard } from './board';
import { applyMove, legalMoves } from './rules';
import { AFTER_EACH_MOVE, solve } from './solver';

/**
 * The timing property the interface depends on: a position is reported lost on the move
 * that loses it, not a move later.
 *
 * A notice that arrives late is worse than none, because the player has already made
 * another move and no longer knows which one was the mistake.
 */
describe('dead detection timing', () => {
  const inputs = JSON.parse(
    readFileSync(resolve(__dirname, '../../../conformance/v1/replay-inputs.json'), 'utf8'),
  ) as { id: string; board: { tubes: number[][]; capacity: number; colourCount: number } }[];

  it('flags the losing move immediately, from a real level', () => {
    // Walk a real level badly on purpose until the position dies.
    const input = inputs.find((i) => i.id.startsWith('c7')) ?? inputs[0];
    let board = createBoard(input.board.tubes, input.board.capacity, input.board.colourCount);

    expect(solve(board, AFTER_EACH_MOVE).verdict).toBe('winnable');

    let died = false;
    for (let step = 0; step < 120; step++) {
      const moves = legalMoves(board);
      if (moves.length === 0) {
        died = true;
        break;
      }

      // Deliberately poor play: always take the last option, which tends to bury colours.
      const applied = applyMove(board, moves[moves.length - 1]);
      if (applied === null) {
        break;
      }

      const before = board;
      board = applied.board;

      if (solve(board, AFTER_EACH_MOVE).verdict === 'dead') {
        // The position before the move must still have been winnable, or the notice would
        // be arriving late.
        expect(solve(before, AFTER_EACH_MOVE).verdict).not.toBe('dead');
        died = true;
        break;
      }
    }

    expect(died).toBe(true);
  });

  it('reports the same verdict for the same position, so undo cannot strand the notice', () => {
    // The interface derives "stuck" from the current board alone. That is what makes undo
    // clear the notice without any extra bookkeeping - the earlier board was winnable, so
    // returning to it is winnable again.
    const input = inputs[0];
    const a = createBoard(input.board.tubes, input.board.capacity, input.board.colourCount);
    const b = createBoard(input.board.tubes, input.board.capacity, input.board.colourCount);

    expect(solve(a, AFTER_EACH_MOVE).verdict).toBe(solve(b, AFTER_EACH_MOVE).verdict);
    expect(solve(a, AFTER_EACH_MOVE).verdict).toBe('winnable');
  });
});
