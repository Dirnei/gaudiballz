/**
 * How far into the campaign the player may go.
 *
 * The rule is one level past the furthest one finished, or wherever a level code has taken
 * them — whichever is further. It is kept here, pure and remembered on the device, for one
 * reason: progress is fetched from the server, and a fetch that fails would otherwise drop
 * a player who is fifty levels in back to level 1. The device's own record is the floor
 * under that, so being offline costs the player nothing.
 */

const UNLOCKED_LEVEL_KEY = 'puzzle.unlockedLevel';

/** The highest level the player may open. Never below 1, never lowered by a missing fetch. */
export function ceilingFor(highestCompleted: number | null, unlocked: number): number {
  return Math.max(1, unlocked, (highestCompleted ?? 0) + 1);
}

/** What this device remembers, or 0 when it remembers nothing usable. */
export function readUnlocked(): number {
  try {
    const stored = localStorage.getItem(UNLOCKED_LEVEL_KEY);
    if (stored === null) {
      return 0;
    }

    const value = Number(stored);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  } catch {
    return 0;
  }
}

/** Records a level as reachable, and returns what the device now remembers. Only ever rises. */
export function rememberUnlocked(level: number): number {
  const next = Math.max(readUnlocked(), Math.floor(level));

  try {
    localStorage.setItem(UNLOCKED_LEVEL_KEY, String(next));
  } catch {
    // Best-effort: the server's progress still carries the ceiling while this session lasts.
  }

  return next;
}

/** Signing out leaves nothing behind for whoever plays next. */
export function forgetUnlocked(): void {
  try {
    localStorage.removeItem(UNLOCKED_LEVEL_KEY);
  } catch {
    // Nothing to clear.
  }
}
