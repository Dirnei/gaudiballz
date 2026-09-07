import { beforeEach, describe, expect, it } from 'vitest';
import { ceilingFor, forgetUnlocked, readUnlocked, rememberUnlocked } from './ceiling';

describe('the level ceiling', () => {
  beforeEach(() => localStorage.clear());

  it('starts at level 1 for a player with no progress', () => {
    expect(ceilingFor(null, readUnlocked())).toBe(1);
    expect(ceilingFor(0, 0)).toBe(1);
  });

  it('is one past the furthest level finished', () => {
    expect(ceilingFor(7, 0)).toBe(8);
  });

  it('takes a code unlock when that reaches further', () => {
    expect(ceilingFor(7, 40)).toBe(40);
  });

  it('ignores a code unlock the player has already played past', () => {
    expect(ceilingFor(60, 40)).toBe(61);
  });

  /** The reason this module exists: a failed progress fetch must not strand the player. */
  it('holds when progress cannot be loaded', () => {
    rememberUnlocked(52);

    expect(ceilingFor(null, readUnlocked())).toBe(52);
  });

  it('never lowers what the device remembers', () => {
    rememberUnlocked(52);

    expect(rememberUnlocked(9)).toBe(52);
    expect(readUnlocked()).toBe(52);
  });

  it('reads nothing out of junk left in storage', () => {
    localStorage.setItem('puzzle.unlockedLevel', 'not a level');

    expect(readUnlocked()).toBe(0);
  });

  it('is forgotten on the way out', () => {
    rememberUnlocked(52);

    forgetUnlocked();

    expect(readUnlocked()).toBe(0);
  });
});
