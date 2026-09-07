import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBoard, type Board } from './board';
import { applyMove, isSolved, legalMoves } from './rules';
import { AFTER_EACH_MOVE, ON_REQUEST, canonicalKey, hint, solve } from './solver';

/** Capacity-4 board from tube strings, 'r' red 'b' blue 'g' green. */
function board(colours: number, ...tubes: string[]): Board {
  const map: Record<string, number> = { r: 1, b: 2, g: 3, y: 4 };
  return createBoard(
    tubes.map((t) => [...t].map((c) => map[c])),
    4,
    colours,
  );
}

describe('canonical key', () => {
  it('treats reordered tubes as one position', () => {
    const a = board(2, 'rrbb', 'bbrr', '', '');
    const b = board(2, '', 'bbrr', 'rrbb', '');

    expect(canonicalKey(a)).toBe(canonicalKey(b));
  });

  it('separates positions that differ in contents', () => {
    const a = board(2, 'rrbb', 'bbrr', '', '');
    const b = board(2, 'rbrb', 'brbr', '', '');

    expect(canonicalKey(a)).not.toBe(canonicalKey(b));
  });
});

describe('verdicts', () => {
  it('reports a solved board as winnable', () => {
    expect(solve(board(2, 'rrrr', 'bbbb', '', '')).verdict).toBe('winnable');
  });

  it('reports a solvable position as winnable', () => {
    expect(solve(board(2, 'rrrb', 'bbbr', '', '')).verdict).toBe('winnable');
  });

  it('reports a board with no legal moves as dead', () => {
    // Two colours, two tubes, both full and mixed: nothing can move anywhere.
    const stuck = createBoard(
      [
        [1, 2, 1, 2],
        [2, 1, 2, 1],
      ],
      4,
      2,
    );

    expect(legalMoves(stuck)).toHaveLength(0);
    expect(solve(stuck).verdict).toBe('dead');
  });

  it('reports a genuinely unwinnable position as dead', () => {
    // Red is buried under blue in both tubes and there is nowhere to unstack it.
    const doomed = createBoard(
      [
        [1, 2, 2, 2],
        [2, 1, 1, 1],
      ],
      4,
      2,
    );

    expect(solve(doomed).verdict).toBe('dead');
  });

  /** The rule that matters most: running out of budget is never a claim. */
  it('reports unknown, never dead, when the budget runs out', () => {
    const wide = createBoard(
      [
        [1, 2, 3, 4],
        [4, 3, 2, 1],
        [2, 1, 4, 3],
        [3, 4, 1, 2],
        [],
        [],
      ],
      4,
      4,
    );

    const result = solve(wide, { maxNodes: 3, maxMillis: 1000 });

    expect(result.verdict).toBe('unknown');
    expect(result.verdict).not.toBe('dead');
    expect(result.move).toBeNull();
  });
});

describe('hints', () => {
  it('suggests a move that keeps the position winnable', () => {
    const start = board(3, 'rrbg', 'bbgr', 'ggrb', '', '');
    const move = hint(start);

    expect(move).not.toBeNull();

    const next = applyMove(start, move!);
    expect(next).not.toBeNull();
    expect(solve(next!.board).verdict).toBe('winnable');
  });

  it('solves the level when followed repeatedly', () => {
    let current = board(3, 'rrbg', 'bbgr', 'ggrb', '', '');

    for (let step = 0; step < 200 && !isSolved(current); step++) {
      const move = hint(current);
      expect(move).not.toBeNull();

      const next = applyMove(current, move!);
      expect(next).not.toBeNull();
      current = next!.board;
    }

    expect(isSolved(current)).toBe(true);
  });

  it('offers nothing on a dead position', () => {
    const doomed = createBoard(
      [
        [1, 2, 2, 2],
        [2, 1, 1, 1],
      ],
      4,
      2,
    );

    expect(hint(doomed)).toBeNull();
  });
});

describe('budget', () => {
  it('stays within the after-move budget on a busy board', () => {
    const busy = createBoard(
      [
        [1, 2, 3, 4],
        [5, 6, 7, 1],
        [2, 3, 4, 5],
        [6, 7, 1, 2],
        [3, 4, 5, 6],
        [7, 1, 2, 3],
        [4, 5, 6, 7],
        [],
      ],
      4,
      7,
    );

    const started = Date.now();
    const result = solve(busy, AFTER_EACH_MOVE);

    // Allowed some slack over the deadline, since the clock is only read every 512 nodes.
    expect(Date.now() - started).toBeLessThan(AFTER_EACH_MOVE.maxMillis * 4);
    expect(result.nodesExamined).toBeLessThanOrEqual(AFTER_EACH_MOVE.maxNodes);
  });

  it('examines more when asked deliberately', () => {
    expect(ON_REQUEST.maxNodes).toBeGreaterThan(AFTER_EACH_MOVE.maxNodes);
  });
});

describe('against real generated levels', () => {
  /**
   * Cross-checks the solver against the generator's constructive guarantee. Every level is
   * solvable by construction, so any level the solver calls dead means one of the two is
   * wrong — and since generation proves solvability by replaying its own solution, it would
   * be this one.
   */
  const inputs = JSON.parse(
    readFileSync(resolve(__dirname, '../../../conformance/v1/replay-inputs.json'), 'utf8'),
  ) as { id: string; board: { tubes: number[][]; capacity: number; colourCount: number } }[];

  for (const input of inputs) {
    it(`finds a solution for ${input.id}`, () => {
      const start = createBoard(input.board.tubes, input.board.capacity, input.board.colourCount);
      expect(solve(start).verdict).toBe('winnable');
    });
  }
});
