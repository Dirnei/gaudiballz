import { describe, expect, it } from 'vitest';
import {
  UNDOS_PER_ATTEMPT,
  canUndo,
  spendReset,
  spendUndo,
  startLevel,
} from './attempt';

describe('undo budget', () => {
  it('starts full on a fresh level', () => {
    expect(startLevel().undosRemaining).toBe(UNDOS_PER_ATTEMPT);
    expect(canUndo(startLevel())).toBe(true);
  });

  it('goes down by one per undo', () => {
    const after = spendUndo(startLevel());

    expect(after.undosRemaining).toBe(UNDOS_PER_ATTEMPT - 1);
    expect(after.undosUsed).toBe(1);
  });

  it('runs out and stays out', () => {
    let attempt = startLevel();
    for (let i = 0; i < UNDOS_PER_ATTEMPT; i++) {
      attempt = spendUndo(attempt);
    }

    expect(canUndo(attempt)).toBe(false);

    // Spending past the limit must not go negative or keep counting uses.
    const past = spendUndo(attempt);
    expect(past.undosRemaining).toBe(0);
    expect(past.undosUsed).toBe(UNDOS_PER_ATTEMPT);
  });
});

describe('resetting', () => {
  /** Undos are the scarce thing; restarting is how a player earns more of them. */
  it('gives the undo budget back', () => {
    let attempt = spendUndo(spendUndo(startLevel()));
    expect(canUndo(attempt)).toBe(false);

    attempt = spendReset(attempt);

    expect(attempt.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
    expect(canUndo(attempt)).toBe(true);
  });

  it('is not limited', () => {
    let attempt = startLevel();
    for (let i = 0; i < 25; i++) {
      attempt = spendReset(attempt);
    }

    expect(attempt.resetsUsed).toBe(25);
    expect(attempt.undosRemaining).toBe(UNDOS_PER_ATTEMPT);
  });

  it('keeps the tally of undos already used', () => {
    expect(spendReset(spendUndo(startLevel())).undosUsed).toBe(1);
  });
});
