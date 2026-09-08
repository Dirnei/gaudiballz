import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueue, newId, pending, queueLength } from './completionQueue';
import { forgetIdentity, remember, storedToken } from './identity';
import { flushAndClear } from './progress';

/**
 * Signing out has to leave nothing behind, because whatever it leaves gets attributed to
 * whoever uses the device next.
 */
describe('signing out', () => {
  beforeEach(async () => {
    localStorage.clear();
    await flushAndClear();
    vi.restoreAllMocks();
  });

  it('forgets the token and player id', () => {
    remember({
      playerId: 'abc123',
      token: 'a.token',
      isAnonymous: true,
      username: null,
      ball: null,
    });
    expect(storedToken()).toBe('a.token');

    forgetIdentity();

    expect(storedToken()).toBeNull();
    expect(localStorage.getItem('puzzle.playerId')).toBeNull();
  });

  it('empties the queue, so nothing carries over to the next account', async () => {
    // Nothing can be sent: the flush fails and the queue must still be cleared.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await enqueue({ id: newId(), level: 4, moves: 20, hints: 0, recordedAt: 1 });
    await enqueue({ id: newId(), level: 5, moves: 22, hints: 1, recordedAt: 2 });
    expect(await queueLength()).toBe(2);

    await flushAndClear();

    expect(await queueLength()).toBe(0);
  });

  it('sends what it can before clearing', async () => {
    const sent: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        sent.push(JSON.parse(String(init?.body)));
        return { ok: true, status: 200 } as Response;
      }),
    );

    await enqueue({ id: newId(), level: 7, moves: 30, hints: 2, recordedAt: 1 });

    await flushAndClear();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ level: 7, moves: 30, hints: 2 });
    expect(await queueLength()).toBe(0);
  });

  it('leaves nothing queued even when the send is refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));

    await enqueue({ id: newId(), level: 2, moves: 15, hints: 0, recordedAt: 1 });

    await flushAndClear();

    expect(await queueLength()).toBe(0);
    expect(await pending()).toHaveLength(0);
  });
});
