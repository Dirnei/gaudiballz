import { describe, expect, it } from 'vitest';
import {
  HINTS_PER_ATTEMPT,
  UNDOS_PER_ATTEMPT,
  canHint,
  canUndo,
  restartLevel,
  spendHint,
  spendUndo,
  startLevel,
} from './attempt';

describe('undo budget', () => {
  it('starts full on a fresh level', () => {
    expect(startLevel().undosRemaining).toBe(UNDOS_PER_ATTEMPT);
    expect(canUndo(startLevel())).toBe(true);
  });

  it('goes down by one per undo', () => {
    expect(spendUndo(startLevel()).undosRemaining).toBe(UNDOS_PER_ATTEMPT - 1);
  });

  it('runs out and stays out', () => {
    let attempt = startLevel();
    for (let i = 0; i < UNDOS_PER_ATTEMPT; i++) {
      attempt = spendUndo(attempt);
    }

    expect(canUndo(attempt)).toBe(false);

    // Spending past the limit must not go negative.
    expect(spendUndo(attempt).undosRemaining).toBe(0);
  });
});

describe('restarting', () => {
  /** Undos are the scarce thing; restarting is how a player earns more of them. */
  it('gives the undo budget back', () => {
    let attempt = startLevel();
    for (let i = 0; i < UNDOS_PER_ATTEMPT; i++) {
      attempt = spendUndo(attempt);
    }
    expect(canUndo(attempt)).toBe(false);

    attempt = restartLevel();

    expect(attempt.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
    expect(canUndo(attempt)).toBe(true);
  });

  it('is not limited', () => {
    let attempt = startLevel();
    for (let i = 0; i < 25; i++) {
      attempt = restartLevel();
    }

    expect(attempt.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
  });
});

describe('hint budget', () => {
  it('starts full on a fresh level', () => {
    expect(startLevel().hintsRemaining).toBe(HINTS_PER_ATTEMPT);
    expect(canHint(startLevel())).toBe(true);
  });

  it('is three, which is scarcer than the undo budget', () => {
    // A hint solves the problem for you; an undo only takes a step back. They are not the
    // same kind of help and deliberately do not carry the same number.
    expect(HINTS_PER_ATTEMPT).toBe(3);
    expect(HINTS_PER_ATTEMPT).toBeLessThan(UNDOS_PER_ATTEMPT);
  });

  it('goes down by one per hint', () => {
    expect(spendHint(startLevel()).hintsRemaining).toBe(HINTS_PER_ATTEMPT - 1);
  });

  it('runs out and stays out', () => {
    let attempt = startLevel();
    for (let i = 0; i < HINTS_PER_ATTEMPT; i++) {
      attempt = spendHint(attempt);
    }

    expect(canHint(attempt)).toBe(false);

    // Spending past the limit must not go negative.
    expect(spendHint(attempt).hintsRemaining).toBe(0);
  });

  it('is given back by restarting', () => {
    let attempt = startLevel();
    for (let i = 0; i < HINTS_PER_ATTEMPT; i++) {
      attempt = spendHint(attempt);
    }
    expect(canHint(attempt)).toBe(false);

    attempt = restartLevel();

    expect(attempt.hintsRemaining).toBe(HINTS_PER_ATTEMPT);
    expect(canHint(attempt)).toBe(true);
  });
});

/**
 * The two budgets share one attempt so that neither can be restored without the other. A
 * reset that gave back undos but not hints would be a bug nobody notices until late in a
 * level, so it is pinned here rather than left to the reset code to remember.
 */
describe('the two budgets travel together', () => {
  it('spending one leaves the other alone', () => {
    const spent = spendUndo(startLevel());
    expect(spent.hintsRemaining).toBe(HINTS_PER_ATTEMPT);

    const hinted = spendHint(startLevel());
    expect(hinted.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
  });

  it('restarting restores both at once', () => {
    let attempt = startLevel();
    attempt = spendUndo(spendHint(attempt));

    attempt = restartLevel();

    expect(attempt.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
    expect(attempt.hintsRemaining).toBe(HINTS_PER_ATTEMPT);
  });
});
