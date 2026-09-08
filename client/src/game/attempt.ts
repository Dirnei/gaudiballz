/**
 * The cost side of a level: how many undos are left.
 *
 * Kept pure and separate from the game hook so the rules can be tested directly. Undo was
 * unlimited, which meant a mistake cost nothing and there was no reason to think before
 * tapping.
 */

export const UNDOS_PER_ATTEMPT = 5;

export interface Attempt {
  readonly undosRemaining: number;
}

/** A fresh level: undos full. */
export function startLevel(): Attempt {
  return { undosRemaining: UNDOS_PER_ATTEMPT };
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

  return { undosRemaining: attempt.undosRemaining - 1 };
}

/**
 * Restarts the level, which is to say: starts a new attempt.
 *
 * Not limited, and this is the point of it: undos are the scarce thing, and starting the
 * level again is how a player earns a fresh set. Losing the progress made so far is cost
 * enough without a cap on top.
 *
 * Nothing carries across. The attempt just given up has already been paid for in the
 * progress thrown away, so nothing it spent is charged against the next one.
 */
export function restartLevel(): Attempt {
  return startLevel();
}
