import { useSyncExternalStore } from 'react';
import { CHANGELOG, type ChangelogEntry } from './entries';
import { compareVersions } from './parse';

/**
 * Which releases this browser has already been shown.
 *
 * Stored as the version of the newest release seen, so editing old release notes never
 * brings the notice back. Nothing leaves the browser.
 */

export const SEEN_KEY = 'gaudi-changelog-seen';

/** Written by the identity module on first launch; its absence means a first visit. */
const PLAYER_KEY = 'puzzle.playerId';

const NONE: readonly ChangelogEntry[] = [];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Without a marker nothing counts as unseen, which is the harmless outcome.
  }
}

const listeners = new Set<() => void>();

/**
 * Decides where a browser without a marker starts.
 *
 * A first visit has seen everything — nothing is news to someone who has never played. A
 * player who was here before the changelog existed gets the newest release only, not the whole
 * history. This has to run before the identity module writes its player id, or every first
 * visit would look like a returning player.
 */
export function initialiseSeen(entries: readonly ChangelogEntry[] = CHANGELOG): void {
  if (entries.length === 0 || read(SEEN_KEY) !== null) return;

  const returning = read(PLAYER_KEY) !== null;
  write(SEEN_KEY, returning ? (entries[1]?.version ?? '0.0.0') : entries[0]!.version);
}

let cache: { entries: readonly ChangelogEntry[]; marker: string | null; unseen: readonly ChangelogEntry[] } | null = null;

/** Releases newer than the newest one seen, newest first. Empty when storage is unavailable. */
export function unseenEntries(entries: readonly ChangelogEntry[] = CHANGELOG): readonly ChangelogEntry[] {
  const marker = read(SEEN_KEY);
  if (cache?.entries === entries && cache.marker === marker) return cache.unseen;

  const unseen = marker === null ? NONE : entries.filter((entry) => compareVersions(entry.version, marker) > 0);
  cache = { entries, marker, unseen: unseen.length === 0 ? NONE : unseen };
  return cache.unseen;
}

export function markAllSeen(entries: readonly ChangelogEntry[] = CHANGELOG): void {
  const newest = entries[0];
  if (newest === undefined || read(SEEN_KEY) === newest.version) return;

  write(SEEN_KEY, newest.version);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnseenChangelog(): readonly ChangelogEntry[] {
  return useSyncExternalStore(subscribe, () => unseenEntries());
}

initialiseSeen();
