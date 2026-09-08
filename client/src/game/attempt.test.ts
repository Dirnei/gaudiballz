import { describe, expect, it } from 'vitest';
import { UNDOS_PER_ATTEMPT, canUndo, restartLevel, spendUndo, startLevel } from './attempt';

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
