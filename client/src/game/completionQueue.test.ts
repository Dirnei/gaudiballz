import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { enqueue, forget, newId, pending, queueLength } from './completionQueue';

/**
 * The queue is the promise that finishing a level never loses the work, whatever the
 * network is doing. These check the properties that promise rests on.
 */
describe('the completion queue', () => {
  beforeEach(async () => {
    for (const item of await pending()) {
      await forget(item.id);
    }
  });

  function completion(level: number, moves = 20, hints = 0, recordedAt = Date.now()) {
    return { id: newId(), level, moves, hints, recordedAt };
  }

  it('keeps a completion that has not been sent', async () => {
    await enqueue(completion(4));

    const waiting = await pending();

    expect(waiting).toHaveLength(1);
    expect(waiting[0].level).toBe(4);
  });

  it('survives the database being reopened, as it must across a restart', async () => {
    await enqueue(completion(7, 33, 2));

    // Every operation opens and closes its own connection, so reading again is the same
    // path a fresh page load takes.
    const waiting = await pending();

    expect(waiting[0].level).toBe(7);
    expect(waiting[0].moves).toBe(33);
    expect(waiting[0].hints).toBe(2);
  });

  it('drains in the order things were completed, not by level', async () => {
    // Explicit timestamps: deriving them from the clock made the test depend on how fast
    // three inserts happened to run, which is exactly the kind of ordering it claims to check.
    await enqueue(completion(9, 20, 0, 1_000));
    await enqueue(completion(2, 20, 0, 2_000));
    await enqueue(completion(5, 20, 0, 3_000));

    const levels = (await pending()).map((c) => c.level);

    expect(levels).toEqual([9, 2, 5]);
  });

  it('forgets an item once it has been sent', async () => {
    const item = completion(5);
    await enqueue(item);
    expect(await queueLength()).toBe(1);

    await forget(item.id);

    expect(await queueLength()).toBe(0);
  });

  /**
   * Each item carries a client-generated id, so an item resent after an unclear failure
   * replaces itself rather than being counted twice.
   */
  it('does not double-count a re-queued item', async () => {
    const item = completion(8);

    await enqueue(item);
    await enqueue(item);

    expect(await queueLength()).toBe(1);
  });

  it('gives every completion a distinct id', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId()));
    expect(ids.size).toBe(500);
  });
});
