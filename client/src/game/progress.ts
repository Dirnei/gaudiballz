/**
 * Recording and reading progress, with the offline queue in front of it.
 */

import { API, authHeaders, sessionId as clientSessionId } from './identity';
import { clearQueue, enqueue, forget, newId, pending, type PendingCompletion } from './completionQueue';

export interface ProgressEntry {
  readonly level: number;
  readonly moves: number;
  readonly hints: number;
  readonly stars: number;
  readonly points: number;
}

export interface Progress {
  readonly levelsCompleted: number;
  readonly highestCompleted: number;
  readonly totalPoints: number;
  readonly levels: readonly ProgressEntry[];
}

export const NO_PROGRESS: Progress = { levelsCompleted: 0, highestCompleted: 0, totalPoints: 0, levels: [] };

export interface NewAchievement {
  readonly id: string;
  readonly name: string;
}

export interface CompletionResult {
  readonly newAchievements: NewAchievement[];
  readonly attemptStars: number;
  readonly attemptPoints: number;
  readonly starDelta: number;
  readonly replayBonus: number;
  readonly timeBonus: number;
}

export interface CompletionMetadata {
  readonly elapsedTimeMs?: number;
  readonly undoCount: number;
  readonly restarted: boolean;
  readonly colourCount: number;
  readonly parMoves: number;
}

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
 *
 * Returns any newly earned achievements from the server response, or an empty array when
 * the server could not be reached or had nothing to report.
 */
export async function recordCompletion(
  level: number,
  moves: number,
  hints: number,
  metadata?: CompletionMetadata,
): Promise<CompletionResult> {
  await enqueue({
    id: newId(),
    level,
    moves,
    hints,
    recordedAt: Date.now(),
    elapsedTimeMs: metadata?.elapsedTimeMs,
    undoCount: metadata?.undoCount,
    restarted: metadata?.restarted,
    sessionId: clientSessionId,
    colourCount: metadata?.colourCount,
    parMoves: metadata?.parMoves,
  });
  return drain();
}

/**
 * Sends whatever is waiting. Safe to call at any time — the server keeps the better result
 * per level, so a resend cannot inflate anything.
 *
 * Returns any newly earned achievements from the last successful response.
 */
const EMPTY_RESULT: CompletionResult = { newAchievements: [], attemptStars: 0, attemptPoints: 0, starDelta: 0, replayBonus: 0, timeBonus: 0 };

export async function drain(): Promise<CompletionResult> {
  let waiting: PendingCompletion[];
  try {
    waiting = await pending();
  } catch {
    return EMPTY_RESULT;
  }

  let lastResult: CompletionResult = EMPTY_RESULT;

  for (const item of waiting) {
    try {
      const response = await fetch(`${API}/api/v1/progress/completions`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          level: item.level,
          moves: item.moves,
          hints: item.hints,
          elapsedTimeMs: item.elapsedTimeMs,
          undoCount: item.undoCount,
          restarted: item.restarted,
          sessionId: item.sessionId,
          colourCount: item.colourCount,
          parMoves: item.parMoves,
        }),
      });

      if (response.ok) {
        try {
          const body = (await response.json()) as {
            newAchievements?: NewAchievement[];
            attemptStars?: number;
            attemptPoints?: number;
            starDelta?: number;
            replayBonus?: number;
            timeBonus?: number;
          };
          lastResult = {
            newAchievements: body.newAchievements ?? [],
            attemptStars: body.attemptStars ?? 0,
            attemptPoints: body.attemptPoints ?? 0,
            starDelta: body.starDelta ?? 0,
            replayBonus: body.replayBonus ?? 0,
            timeBonus: body.timeBonus ?? 0,
          };
        } catch {
          lastResult = EMPTY_RESULT;
        }
        await forget(item.id);
        continue;
      }

      if (response.status === 400) {
        await forget(item.id);
        continue;
      }

      return lastResult;
    } catch {
      return lastResult;
    }
  }

  return lastResult;
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

/**
 * Sends whatever is waiting, then empties the queue either way.
 *
 * Called on the way out. A best-effort flush means work already done reaches the account it
 * belongs to; clearing regardless means nothing is left to be misattributed to whoever uses
 * this device next.
 */
export async function flushAndClear(): Promise<void> {
  try {
    await drain();
  } catch {
    // Offline, or the account is already unreachable. Either way it must not carry over.
  }

  try {
    await clearQueue();
  } catch {
    // Storage unavailable; there is nothing queued to worry about.
  }
}
