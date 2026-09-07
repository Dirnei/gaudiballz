/**
 * Who this browser is playing as.
 *
 * An identity is obtained silently on first launch — no form, no interaction, nothing to
 * dismiss. It is a real server record from the start, so attaching a passkey later adds to
 * it rather than starting again, and nothing completed beforehand is lost.
 */

const TOKEN_KEY = 'puzzle.token';
const PLAYER_KEY = 'puzzle.playerId';

export interface Identity {
  readonly playerId: string;
  readonly token: string;
  readonly isAnonymous: boolean;
}

export const API =
  import.meta.env['VITE_API_URL'] ??
  (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:5199` : '');

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // A private window or blocked storage is not a reason to fail; the player just gets a
    // fresh identity each visit, which is the same as today.
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not worth failing a game over.
  }
}

export function storedToken(): string | null {
  return read(TOKEN_KEY);
}

export function remember(identity: Identity): void {
  write(TOKEN_KEY, identity.token);
  write(PLAYER_KEY, identity.playerId);
}

/** Adds the bearer token, when there is one. */
export function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = storedToken();
  return token === null ? extra : { ...extra, Authorization: `Bearer ${token}` };
}

/**
 * Returns the identity for this browser, creating one if needed.
 *
 * A stored token that the server no longer recognises — a rotated signing key, a wiped
 * database — is replaced rather than reported. There is nothing the player could do about
 * it and nothing to explain.
 */
export async function ensureIdentity(): Promise<Identity | null> {
  const token = storedToken();

  if (token !== null) {
    try {
      const response = await fetch(`${API}/api/v1/players/me`, { headers: authHeaders() });
      if (response.ok) {
        const me = (await response.json()) as { playerId: string; isAnonymous: boolean };
        return { playerId: me.playerId, token, isAnonymous: me.isAnonymous };
      }
    } catch {
      // Offline. Keep playing as whoever this browser already was.
      const playerId = read(PLAYER_KEY);
      return playerId === null ? null : { playerId, token, isAnonymous: true };
    }
  }

  try {
    const response = await fetch(`${API}/api/v1/players/anonymous`, { method: 'POST' });
    if (!response.ok) {
      return null;
    }

    const identity = (await response.json()) as Identity;
    remember(identity);
    return identity;
  } catch {
    // No network on a first ever launch: play anyway, and pick up an identity later.
    return null;
  }
}
