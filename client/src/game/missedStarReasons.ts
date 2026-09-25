/**
 * Why an attempt fell short of 3 stars, so the win screen can say so.
 *
 * The server decides the stars; this only mirrors the level-scoring rule closely enough to name
 * what to fix. Every missed condition is listed, not just the one that decided the rating: a
 * player over par and slow has to fix both to get 3 stars, so telling them only about the moves
 * would send them back for a replay that still falls short.
 */

export type MissedStarReason =
  | { readonly kind: 'hints' }
  | { readonly kind: 'moves'; readonly over: number }
  | { readonly kind: 'time'; readonly overSeconds: number };

export interface AttemptNumbers {
  readonly moves: number;
  readonly par: number;
  readonly elapsedMs: number;
  readonly timeTargetMs: number | undefined;
  readonly hintsUsed: number;
}

export function missedStarReasons(a: AttemptNumbers): MissedStarReason[] {
  const reasons: MissedStarReason[] = [];

  if (a.hintsUsed > 0) {
    reasons.push({ kind: 'hints' });
  }

  if (a.par > 0 && a.moves > a.par) {
    reasons.push({ kind: 'moves', over: a.moves - a.par });
  }

  if (a.timeTargetMs != null && a.elapsedMs > a.timeTargetMs) {
    // Rounded up to the tenth the timer shows, so being over never reads as "0.0s over".
    reasons.push({ kind: 'time', overSeconds: Math.ceil((a.elapsedMs - a.timeTargetMs) / 100) / 10 });
  }

  return reasons;
}
