/**
 * The cost side of a level: how many undos are left.
 *
 * Kept pure and separate from the game hook so the rules can be tested directly. Undo was
 * unlimited, which meant a mistake cost nothing and there was no reason to think before
 * tapping.
 */

export const UNDOS_PER_ATTEMPT = 2;

export interface Attempt {
  readonly undosRemaining: number;
  readonly undosUsed: number;
  readonly resetsUsed: number;
}

/** A fresh level: undos full. */
export function startLevel(): Attempt {
  return { undosRemaining: UNDOS_PER_ATTEMPT, undosUsed: 0, resetsUsed: 0 };
}

export function canUndo(attempt: Attempt): boolean {
  return attempt.undosRemaining > 0;
}

/**
 * Spends an undo. Returns the attempt unchanged when the budget is gone, so callers cannot
 * accidentally undo past the limit by not checking first.
 */
export function spendUndo(attempt: Attempt): Attempt {
  if (!canUndo(attempt)) {
    return attempt;
  }

  return {
    ...attempt,
    undosRemaining: attempt.undosRemaining - 1,
    undosUsed: attempt.undosUsed + 1,
  };
}

/**
 * Restarts the level.
 *
 * Not limited, and this is the point of it: undos are the scarce thing, and starting the
 * level again is how a player earns a fresh set. Losing the progress made so far is cost
 * enough without a cap on top.
 */
export function spendReset(attempt: Attempt): Attempt {
  return {
    undosRemaining: UNDOS_PER_ATTEMPT,
    undosUsed: attempt.undosUsed,
    resetsUsed: attempt.resetsUsed + 1,
  };
}
