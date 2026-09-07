/**
 * Recording and reading progress, with the offline queue in front of it.
 */

import { API, authHeaders } from './identity';
import { enqueue, forget, newId, pending, type PendingCompletion } from './completionQueue';

export interface ProgressEntry {
  readonly level: number;
  readonly moves: number;
  readonly hints: number;
}

export interface Progress {
  readonly levelsCompleted: number;
  readonly highestCompleted: number;
  readonly levels: readonly ProgressEntry[];
}

export const NO_PROGRESS: Progress = { levelsCompleted: 0, highestCompleted: 0, levels: [] };

export async function loadProgress(): Promise<Progress | null> {
  try {
    const response = await fetch(`${API}/api/v1/progress/`, { headers: authHeaders() });
    return response.ok ? ((await response.json()) as Progress) : null;
  } catch {
    return null;
  }
}

/**
 * Records a completion.
 *
 * Always queues first, then tries to drain. That ordering is what makes losing a completion
 * impossible: the queue write happens before the network is involved, so a request that
 * fails, times out, or is cut off by the tab closing leaves the work waiting rather than
 * gone.
 */
export async function recordCompletion(level: number, moves: number, hints: number): Promise<void> {
  await enqueue({ id: newId(), level, moves, hints, recordedAt: Date.now() });
  await drain();
}

/**
 * Sends whatever is waiting. Safe to call at any time — the server keeps the better result
 * per level, so a resend cannot inflate anything.
 */
export async function drain(): Promise<void> {
  let waiting: PendingCompletion[];
  try {
    waiting = await pending();
  } catch {
    return;
  }

  for (const item of waiting) {
    try {
      const response = await fetch(`${API}/api/v1/progress/completions`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ level: item.level, moves: item.moves, hints: item.hints }),
      });

      if (response.ok) {
        await forget(item.id);
        continue;
      }

      // A rejection the server is sure about will never succeed, so drop it rather than
      // retrying forever. Anything else is worth another go later.
      if (response.status === 400) {
        await forget(item.id);
        continue;
      }

      return;
    } catch {
      // Offline. Everything from here stays queued, in order.
      return;
    }
  }
}

/**
 * Folds this device's progress into the account being signed in to.
 *
 * Called once at sign-in. The server keeps the better result per level, so neither side
 * loses anything and running it twice changes nothing.
 */
export async function mergeIntoAccount(levels: readonly ProgressEntry[]): Promise<Progress | null> {
  if (levels.length === 0) {
    return loadProgress();
  }

  try {
    const response = await fetch(`${API}/api/v1/progress/merge`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ levels }),
    });

    return response.ok ? ((await response.json()) as Progress) : null;
  } catch {
    return null;
  }
}
