import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangelogEntry } from './entries';
import { initialiseSeen, markAllSeen, SEEN_KEY, unseenEntries } from './seen';

function release(version: string): ChangelogEntry {
  return { version, date: '2026-09-24', features: [version], fixes: [] };
}

const LOG = [release('0.10.0'), release('0.9.0'), release('0.8.0')];
const versions = (entries: readonly ChangelogEntry[]) => entries.map((e) => e.version);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('changelog seen-marker', () => {
  it('shows nothing on a first visit', () => {
    initialiseSeen(LOG);

    expect(unseenEntries(LOG)).toEqual([]);
    expect(localStorage.getItem(SEEN_KEY)).toBe('0.10.0');
  });

  it('shows only the newest release to a player who predates the changelog', () => {
    localStorage.setItem('puzzle.playerId', 'p1');
    initialiseSeen(LOG);

    expect(versions(unseenEntries(LOG))).toEqual(['0.10.0']);
  });

  it('shows the single release to an existing player when there is only one', () => {
    localStorage.setItem('puzzle.playerId', 'p1');
    initialiseSeen([release('0.7.0')]);

    expect(versions(unseenEntries([release('0.7.0')]))).toEqual(['0.7.0']);
  });

  it('lists every release newer than the last one seen, newest first', () => {
    localStorage.setItem(SEEN_KEY, '0.8.0');
    initialiseSeen(LOG);

    expect(versions(unseenEntries(LOG))).toEqual(['0.10.0', '0.9.0']);
  });

  it('compares versions as numbers, not text', () => {
    localStorage.setItem(SEEN_KEY, '0.9.0');

    expect(versions(unseenEntries(LOG))).toEqual(['0.10.0']);
  });

  it('leaves an existing marker alone', () => {
    localStorage.setItem('puzzle.playerId', 'p1');
    localStorage.setItem(SEEN_KEY, '0.8.0');
    initialiseSeen(LOG);

    expect(localStorage.getItem(SEEN_KEY)).toBe('0.8.0');
  });

  it('remembers once everything is marked seen', () => {
    localStorage.setItem(SEEN_KEY, '0.8.0');
    markAllSeen(LOG);
    initialiseSeen(LOG);

    expect(unseenEntries(LOG)).toEqual([]);
  });

  it('shows nothing when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => initialiseSeen(LOG)).not.toThrow();
    expect(unseenEntries(LOG)).toEqual([]);
    expect(() => markAllSeen(LOG)).not.toThrow();
  });

  it('shows nothing when the marker could not be written', () => {
    localStorage.setItem('puzzle.playerId', 'p1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    initialiseSeen(LOG);

    expect(unseenEntries(LOG)).toEqual([]);
  });
});
