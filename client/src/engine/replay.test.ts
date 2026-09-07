import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBoard, type Board } from './board';
import { applyMove, isSolved, legalMoves, validate, type MoveRejection } from './rules';

/**
 * The TypeScript half of the bidirectional conformance check.
 *
 * Every other fixture is generated from the C# engine, so passing them only proves this
 * engine matches a snapshot of that one. Here this engine answers first: it replays the
 * shared inputs and records what it believes, and a C# test then asserts the two agree. A
 * shared misreading of the spec fails on one side or the other rather than sailing through.
 *
 * Set PUZZLE_REGEN=1 to re-record after a deliberate rule change — and regenerate the C#
 * fixtures too, or the sides end up comparing different inputs.
 */

const FIXTURE_DIR = resolve(__dirname, '../../../conformance/v1');

interface BoardShape {
  tubes: number[][];
  capacity: number;
  colourCount: number;
}

interface ReplayInput {
  id: string;
  board: BoardShape;
  moves: { from: number; to: number }[];
}

interface ReplayStep {
  rejection: MoveRejection;
  movedCount: number;
  legalMoveCount: number;
  solved: boolean;
  board: BoardShape;
}

function shapeOf(board: Board): BoardShape {
  return {
    tubes: board.tubes.map((tube) => [...tube]),
    capacity: board.capacity,
    colourCount: board.colourCount,
  };
}

function replay(input: ReplayInput): { id: string; steps: ReplayStep[] } {
  let board = createBoard(input.board.tubes, input.board.capacity, input.board.colourCount);
  const steps: ReplayStep[] = [];

  for (const move of input.moves) {
    const rejection = validate(board, move);
    const result = applyMove(board, move);
    if (result !== null) {
      board = result.board;
    }

    steps.push({
      rejection,
      movedCount: result?.movedCount ?? 0,
      legalMoveCount: legalMoves(board).length,
      solved: isSolved(board),
      board: shapeOf(board),
    });
  }

  return { id: input.id, steps };
}

describe('bidirectional replay trace', () => {
  const inputs = JSON.parse(
    readFileSync(resolve(FIXTURE_DIR, 'replay-inputs.json'), 'utf8'),
  ) as ReplayInput[];

  const traced = inputs.map(replay);
  const tracePath = resolve(FIXTURE_DIR, 'ts-replay.json');
  const serialised = `${JSON.stringify(traced, null, 2)}\n`;

  if (process.env['PUZZLE_REGEN'] === '1') {
    writeFileSync(tracePath, serialised, 'utf8');
  }

  it('has inputs to replay', () => {
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every((i) => i.moves.length > 0)).toBe(true);
  });

  it('matches the committed trace', () => {
    const committed = readFileSync(tracePath, 'utf8').replace(/\r\n/g, '\n');

    expect(
      committed === serialised,
      'ts-replay.json is stale — this engine now behaves differently. If that was ' +
        'deliberate, re-record with PUZZLE_REGEN=1; if not, the change is a bug.',
    ).toBe(true);
  });
});
