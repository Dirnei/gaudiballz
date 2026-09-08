/**
 * The ball that represents an account.
 *
 * Which balls a player may choose from is decided by what they have finished, and that is
 * worked out here from two numbers: the level a colour first appears on, and the highest
 * level the player has completed. The first of those comes from the server — the campaign's
 * colour curve lives in one place, and a second copy written in TypeScript would drift
 * without anything to catch it.
 */

import { PALETTE, colourForName } from '../skins';
import { API, authHeaders } from './identity';

export interface BallUnlock {
  readonly colour: number;
  /** The earliest level whose board contains this colour. */
  readonly unlocksAtLevel: number;
}

/** The colours the client can actually draw, 1-based. */
const HIGHEST_COLOUR = PALETTE.length - 1;

/** True when the player has completed a level containing this colour. */
export function isEarned(unlock: BallUnlock, highestCompleted: number): boolean {
  return unlock.unlocksAtLevel <= highestCompleted;
}

/** Every colour the player may choose, in palette order. */
export function availableColours(
  unlocks: readonly BallUnlock[],
  highestCompleted: number,
): number[] {
  return unlocks.filter((unlock) => isEarned(unlock, highestCompleted)).map((u) => u.colour);
}

/**
 * The colour to draw for an account.
 *
 * A chosen colour wins; otherwise the name-derived one, which is what every account looked
 * like before choosing existed. A colour the palette does not have is treated as no choice
 * at all rather than drawn as a blank — the server decides the range from the campaign
 * curve, so a server ahead of the client could name one.
 */
export function ballForAccount(chosen: number | null, name: string): number {
  if (chosen !== null && chosen >= 1 && chosen <= HIGHEST_COLOUR) {
    return chosen;
  }

  return colourForName(name);
}

/**
 * The unlock table, fetched once per session.
 *
 * It is the same for every player and fixed for a given build, so it is worth holding on to;
 * a failure is deliberately not cached, or a picker opened while offline would stay empty
 * for the rest of the session.
 */
let cached: readonly BallUnlock[] | null = null;
let inFlight: Promise<readonly BallUnlock[]> | null = null;

export async function loadBallUnlocks(): Promise<readonly BallUnlock[]> {
  if (cached !== null) {
    return cached;
  }

  inFlight ??= (async () => {
    try {
      const response = await fetch(`${API}/api/v1/profile/balls`);
      if (!response.ok) {
        return [];
      }

      const unlocks = (await response.json()) as BallUnlock[];
      cached = unlocks;
      return unlocks;
    } catch {
      // Offline. The picker shows nothing rather than guessing at the curve.
      return [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Only for tests: forgets the table so the next call fetches again. */
export function resetBallUnlocksCache(): void {
  cached = null;
  inFlight = null;
}

/**
 * Sends the choice to the account. Null clears it, returning to the derived colour.
 *
 * Returns whether it was saved. Nothing is queued on failure: unlike a completion there is
 * no work to lose, and a ball that silently applied later would be worse than one that
 * plainly did not take.
 */
export async function setProfileBall(colour: number | null): Promise<boolean> {
  try {
    const response = await fetch(`${API}/api/v1/players/me/ball`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ colour }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
