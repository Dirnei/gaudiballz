import { describe, expect, it } from 'vitest';
import { createBoard, type Board } from '../../engine';
import { resolveTap, type TapOutcome } from './resolveTap';

/**
 * Every multi-flask-selection scenario, on real boards. `createBoard` refuses a board where a
 * colour does not appear exactly `capacity` times, so each of these is a board the game could
 * actually deal. Colour 1 is "red" throughout.
 */

/** Three full tubes with red on top (runs of 1), two spares. Capacity 3. */
const chain = createBoard([[2, 3, 1], [3, 2, 1], [2, 3, 1], [], []], 3, 3);

/** Red runs of 1 and 2 on full tubes; a red-topped tube with 3 free; blue-topped partial; spare. Capacity 4. */
const fitting = createBoard([[2, 3, 2, 1], [3, 2, 1, 1], [1], [3, 3, 2], []], 4, 3);

/** Same runs of 1 and 2, but the red-topped target has only 2 free. Capacity 4. */
const tight = createBoard([[2, 3, 2, 1], [3, 2, 1, 1], [3, 1], [3, 2], []], 4, 3);

/** A red run of 3, and a red-topped tube with 1 free. Capacity 4. */
const single = createBoard([[2, 1, 1, 1], [2, 2, 3, 3], [3, 3, 1], [2], []], 4, 3);

/** A full red-topped tube, and a full tube with colour 3 on top. Capacity 3. */
const mixed = createBoard([[2, 3, 1], [1, 2, 3], [3, 1, 2], []], 3, 3);

/** Tube 0 is finished in colour 3; tube 1 is full with red on top. Capacity 3. */
const finished = createBoard([[3, 3, 3], [2, 2, 1], [1, 1, 2], []], 3, 3);

/** Tube 0 is partly filled with red on top; tube 1 is full with red on top. Capacity 3. */
const partial = createBoard([[2, 1], [3, 2, 1], [3, 1, 2], [3], []], 3, 3);

const select = (...selected: number[]): TapOutcome => ({ kind: 'select', selected });
const pour = (...moves: [number, number][]): TapOutcome =>
  ({ kind: 'pour', moves: moves.map(([from, to]) => ({ from, to })) });

const cases: [string, Board, number[], number, TapOutcome][] = [
  // Picking up
  ['nothing picked up: picks up the tube', chain, [], 0, select(0)],
  ['nothing picked up: a finished tube is not picked up', finished, [], 0, select()],
  ['nothing picked up: an empty tube is not picked up', chain, [], 3, select()],

  // Joining
  ['a full tube with the same top colour joins', chain, [0], 1, select(0, 1)],
  ['full matching tubes join one after another', chain, [0, 1], 2, select(0, 1, 2)],
  ['a full tube with another top colour replaces the selection', mixed, [0], 1, select(1)],
  ['a finished tube never joins and clears the selection', finished, [1], 0, select()],
  ['a partly filled first pick still gathers full tubes', partial, [0], 1, select(0, 1)],

  // Clearing
  ['tapping a picked-up tube clears everything', chain, [0, 1, 2], 1, select()],
  ['tapping the only picked-up tube puts it down', chain, [0], 0, select()],

  // Multi-pour
  ['several pour into an empty tube, in the order picked', chain, [2, 0, 1], 3, pour([2, 3], [0, 3], [1, 3])],
  ['several pour into a matching tube with room for all', fitting, [0, 1], 2, pour([0, 2], [1, 2])],
  ['room for only some pours nothing and picks up the target', tight, [0, 1], 2, select(2)],
  ['a mismatched partial tube pours nothing and is picked up', fitting, [0, 1], 3, select(3)],

  // Single selection is the old two-tap pour
  ['one picked up pours as before, partial pours included', single, [0], 2, pour([0, 2])],
  ['one picked up pours into an empty tube', single, [0], 4, pour([0, 4])],
  ['one picked up, illegal target: the target is picked up', mixed, [1], 0, select(0)],
];

describe('resolveTap', () => {
  it.each(cases)('%s', (_name, board, selected, index, expected) => {
    expect(resolveTap(board, selected, index)).toEqual(expected);
  });
});
