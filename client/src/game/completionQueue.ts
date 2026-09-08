/**
 * Completions waiting to reach the server.
 *
 * The game never asks whether it is online. It records a completion into this queue, tries
 * to drain the queue, and leaves anything that failed for next time. That makes offline the
 * ordinary path rather than a mode, so there is no state to get wrong and nothing to tell
 * the player about.
 *
 * IndexedDB rather than localStorage: the queue has to survive the tab closing mid-request,
 * and localStorage is synchronous and easily filled.
 */

const DB_NAME = 'puzzle';
const STORE = 'pending-completions';

export interface PendingCompletion {
  /** Client-generated, so a resend after an unclear failure cannot double-count. */
  readonly id: string;
  readonly level: number;
  readonly moves: number;
  readonly hints: number;
  readonly recordedAt: number;
  readonly elapsedTimeMs?: number;
  readonly undoCount?: number;
  readonly restarted?: boolean;
  readonly sessionId?: string;
  readonly colourCount?: number;
  readonly parMoves?: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();

  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueue(completion: PendingCompletion): Promise<void> {
  await withStore('readwrite', (store) => store.put(completion));
}

export async function pending(): Promise<PendingCompletion[]> {
  const all = await withStore<PendingCompletion[]>('readonly', (store) => store.getAll());
  return all.sort((a, b) => a.recordedAt - b.recordedAt);
}

export async function forget(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function queueLength(): Promise<number> {
  return withStore<number>('readonly', (store) => store.count());
}

/**
 * Empties the queue.
 *
 * Used when signing out. Anything still waiting belongs to the account being left, and
 * carrying it over would record one player's work against another — worse than losing it.
 */
export async function clearQueue(): Promise<void> {
  await withStore('readwrite', (store) => store.clear());
}
