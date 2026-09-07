/**
 * The board model.
 *
 * This is the browser half of a cross-language pair; the other half is `Puzzle.Rules` in
 * C#. The `sort-puzzle-rules` capability spec is the arbiter between them, and the
 * fixtures in `conformance/v1/` hold them in step.
 *
 * Internally this may differ from the C# side freely — the fixtures test behaviour, not
 * representation. Tubes are plain arrays here because that is what reads naturally in
 * TypeScript and animates well.
 */

/** A colour is numbered from 1. Zero is not a colour; it means "no item". */
export type Colour = number;

/** One tube, bottom item first. */
export type Tube = readonly Colour[];

export interface Board {
  readonly tubes: readonly Tube[];
  readonly capacity: number;
  readonly colourCount: number;
}

/** Matches the C# limits, which exist to keep a board cheap to copy. */
export const MAX_CAPACITY = 8;
export const MAX_TUBES = 16;

export function createBoard(
  tubes: readonly (readonly Colour[])[],
  capacity: number,
  colourCount: number,
): Board {
  if (capacity < 1 || capacity > MAX_CAPACITY) {
    throw new Error(`Capacity must be between 1 and ${MAX_CAPACITY}, got ${capacity}.`);
  }
  if (tubes.length < 1 || tubes.length > MAX_TUBES) {
    throw new Error(`A board holds between 1 and ${MAX_TUBES} tubes, got ${tubes.length}.`);
  }
  if (colourCount < 1 || colourCount > 255) {
    throw new Error(`Colour count must be between 1 and 255, got ${colourCount}.`);
  }

  const counts = new Array<number>(colourCount + 1).fill(0);
  for (const tube of tubes) {
    if (tube.length > capacity) {
      throw new Error(`A tube holds at most ${capacity} items, got ${tube.length}.`);
    }
    for (const colour of tube) {
      if (colour < 1 || colour > colourCount) {
        throw new Error(`Colour ${colour} is outside 1..${colourCount}.`);
      }
      counts[colour]++;
    }
  }

  for (let colour = 1; colour <= colourCount; colour++) {
    if (counts[colour] !== capacity) {
      throw new Error(
        `Every colour must appear exactly ${capacity} times; ` +
          `colour ${colour} appears ${counts[colour]} times.`,
      );
    }
  }

  return {
    tubes: tubes.map((tube) => [...tube]),
    capacity,
    colourCount,
  };
}

/** The colour on top, or 0 when the tube is empty. */
export function topColour(tube: Tube): Colour {
  return tube.length === 0 ? 0 : tube[tube.length - 1];
}

/**
 * How many items of the top colour sit on top of the stack. This is what a pour picks up.
 * Zero for an empty tube.
 */
export function topRunLength(tube: Tube): number {
  if (tube.length === 0) {
    return 0;
  }

  const colour = tube[tube.length - 1];
  let run = 1;
  for (let slot = tube.length - 2; slot >= 0 && tube[slot] === colour; slot--) {
    run++;
  }

  return run;
}

/** True when the tube holds one colour only. An empty tube is not uniform. */
export function isUniform(tube: Tube): boolean {
  return tube.length > 0 && topRunLength(tube) === tube.length;
}

export function boardsEqual(a: Board, b: Board): boolean {
  if (a.capacity !== b.capacity || a.tubes.length !== b.tubes.length) {
    return false;
  }

  return a.tubes.every(
    (tube, i) =>
      tube.length === b.tubes[i].length && tube.every((colour, j) => colour === b.tubes[i][j]),
  );
}
