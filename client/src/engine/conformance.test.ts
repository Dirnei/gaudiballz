import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBoard, type Board } from './board';
import { applyMove, isSolved, legalMoves, validate, type MoveRejection } from './rules';

/**
 * The cross-language conformance gate.
 *
 * These files are generated from the C# engine and committed; this suite and the C# suite
 * both run against them, and both block merges. The failure mode being guarded is a player
 * solving a puzzle and the server telling them they did not — silent, unrecoverable from
 * the player's side, and indistinguishable from false cheating detection.
 *
 * See `openspec/specs/sort-puzzle-rules/spec.md`, which arbitrates when the two disagree.
 */

const FIXTURE_DIR = resolve(__dirname, '../../../conformance/v1');

interface BoardShape {
  tubes: number[][];
  capacity: number;
  colourCount: number;
}

interface FixtureCase {
  id: string;
  board: BoardShape;
  move?: { from: number; to: number };
  expect: {
    rejection?: MoveRejection;
    movedCount?: number;
    resultBoard?: BoardShape;
    solved?: boolean;
    moves?: { from: number; to: number }[];
  };
}

interface FixtureFile {
  requirement: string;
  cases: FixtureCase[];
}

function load(name: string): FixtureFile {
  return JSON.parse(readFileSync(resolve(FIXTURE_DIR, name), 'utf8')) as FixtureFile;
}

function toBoard(shape: BoardShape): Board {
  return createBoard(shape.tubes, shape.capacity, shape.colourCount);
}

function shapeOf(board: Board): BoardShape {
  return {
    tubes: board.tubes.map((tube) => [...tube]),
    capacity: board.capacity,
    colourCount: board.colourCount,
  };
}

const manifest = JSON.parse(readFileSync(resolve(FIXTURE_DIR, 'MANIFEST.json'), 'utf8')) as {
  rulesVersion: number;
  files: Record<string, string>;
};

describe('conformance manifest', () => {
  it('declares the rule set version this engine implements', () => {
    expect(manifest.rulesVersion).toBe(1);
  });

  it('lists every rule fixture present on disk', () => {
    // The manifest inventories the rule fixtures, which are generated from the C# engine
    // and hashed so drift is caught. The replay pair is a different kind of artifact: it
    // runs the other direction, is produced by two different suites, and each half has its
    // own freshness check, so hashing it here would only make the manifest unstable.
    const replayArtifacts = new Set(['replay-inputs.json', 'ts-replay.json']);

    const onDisk = readdirSync(FIXTURE_DIR)
      .filter((f) => f.endsWith('.json') && f !== 'MANIFEST.json' && !replayArtifacts.has(f))
      .sort();

    expect(onDisk).toEqual(Object.keys(manifest.files).sort());
  });
});

describe('legality fixtures', () => {
  for (const testCase of load('legality.json').cases) {
    it(testCase.id, () => {
      const board = toBoard(testCase.board);
      const move = testCase.move!;

      expect(validate(board, move)).toBe(testCase.expect.rejection);

      const result = applyMove(board, move);
      if (testCase.expect.rejection === 'None') {
        expect(result).not.toBeNull();
        expect(result!.movedCount).toBe(testCase.expect.movedCount);
        expect(shapeOf(result!.board)).toEqual(testCase.expect.resultBoard);
      } else {
        // A rejected move changes nothing.
        expect(result).toBeNull();
      }
    });
  }
});

describe('pour amount fixtures', () => {
  for (const testCase of load('pour-amount.json').cases) {
    it(testCase.id, () => {
      const board = toBoard(testCase.board);
      const result = applyMove(board, testCase.move!);

      expect(result).not.toBeNull();
      expect(result!.movedCount).toBe(testCase.expect.movedCount);
      expect(shapeOf(result!.board)).toEqual(testCase.expect.resultBoard);
    });
  }
});

describe('win condition fixtures', () => {
  for (const testCase of load('win.json').cases) {
    it(testCase.id, () => {
      expect(isSolved(toBoard(testCase.board))).toBe(testCase.expect.solved);
    });
  }
});

describe('enumeration fixtures', () => {
  for (const testCase of load('enumeration.json').cases) {
    it(testCase.id, () => {
      const moves = legalMoves(toBoard(testCase.board));
      expect(moves).toEqual(testCase.expect.moves);
    });
  }
});
