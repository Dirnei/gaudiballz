/**
 * The cost side of a level: how many undos and how many hints are left.
 *
 * Kept pure and separate from the game hook so the rules can be tested directly. Undo was
 * unlimited, which meant a mistake cost nothing and there was no reason to think before
 * tapping. Hints were the same, and worse: an unlimited hint does not just forgive a mistake,
 * it plays the level for you.
 *
 * Both budgets live in one attempt on purpose. They have identical lifecycles — per attempt,
 * restored together on restart — and keeping them in one value makes it impossible to reset
 * one without the other.
 *
 * The running cooldown between hints is deliberately NOT here: a countdown against Date.now()
 * is wall-clock state, and keeping it out is what lets this module be tested without faking
 * time. How long that wait lasts is a different thing — it is a plain number, and it belongs
 * with the other two numbers that say what an attempt costs.
 */

export const UNDOS_PER_ATTEMPT = 5;

/**
 * Fewer than the undos, because the two are not the same kind of help: an undo takes back a
 * step the player took, a hint takes the decision off them entirely.
 */
export const HINTS_PER_ATTEMPT = 3;

/** How long the player waits before each hint, including the first one on a new board. */
export const HINT_COOLDOWN_MS = 30_000;

export interface Attempt {
  readonly undosRemaining: number;
  readonly hintsRemaining: number;
}

/** A fresh level: both budgets full. */
export function startLevel(): Attempt {
  return { undosRemaining: UNDOS_PER_ATTEMPT, hintsRemaining: HINTS_PER_ATTEMPT };
}

export function canUndo(attempt: Attempt): boolean {
  return attempt.undosRemaining > 0;
}

export function canHint(attempt: Attempt): boolean {
  return attempt.hintsRemaining > 0;
}

/**
 * Spends an undo. Returns the attempt unchanged when the budget is gone, so callers cannot
 * accidentally undo past the limit by not checking first.
 */
export function spendUndo(attempt: Attempt): Attempt {
  if (!canUndo(attempt)) {
    return attempt;
  }

  return { ...attempt, undosRemaining: attempt.undosRemaining - 1 };
}

/** Spends a hint, on the same terms: past the limit it is a no-op rather than a negative. */
export function spendHint(attempt: Attempt): Attempt {
  if (!canHint(attempt)) {
    return attempt;
  }

  return { ...attempt, hintsRemaining: attempt.hintsRemaining - 1 };
}

/**
 * Restarts the level, which is to say: starts a new attempt.
 *
 * Not limited, and this is the point of it: undos and hints are the scarce things, and
 * starting the level again is how a player earns a fresh set of both. Losing the progress
 * made so far is cost enough without a cap on top.
 *
 * Nothing carries across. The attempt just given up has already been paid for in the
 * progress thrown away, so nothing it spent is charged against the next one.
 */
export function restartLevel(): Attempt {
  return startLevel();
}
