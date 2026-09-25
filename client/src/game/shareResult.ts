import type { TFunction } from 'i18next';
import { formatTime } from './LiveTimer';

/**
 * A result as text a player can paste into a chat, Wordle-style.
 *
 * Every level is the same board for everyone, so a result is worth comparing. The text is built
 * only from the result numbers, never the board or the player: anything about the board would be
 * a spoiler for the friend it is sent to, and the player's name has no business leaving the game
 * unasked.
 */

export interface ShareResult {
  /** The first line, already in the player's language: which level or which daily. */
  readonly title: string;
  readonly stars: number;
  readonly moves: number;
  readonly par: number;
  readonly elapsedMs: number;
  readonly timeTargetMs: number;
  readonly hintsUsed: number;
  readonly url: string;
}

export function buildShareText(r: ShareResult, t: TFunction): string {
  // Filled and empty stars keep the row three wide, so pasted results line up in a chat.
  const stars = '⭐️'.repeat(r.stars) + '☆'.repeat(Math.max(0, 3 - r.stars));

  let score = `${stars} ${t('game.shareMoves', { moves: r.moves, par: r.par })}`
    + ` | ⏱️ ${formatTime(r.elapsedMs)}s/${formatTime(r.timeTargetMs)}s`;
  if (r.hintsUsed > 0) {
    score += ` | 💡 ${t('game.hints', { count: r.hintsUsed })}`;
  }

  return [r.title, score, t('game.shareLink', { url: r.url })].join('\n\n');
}

/**
 * The link to a result's own page. A completion the server never scored has no page, so the
 * link falls back to where the puzzle can be played instead.
 */
export function resultUrl(shareId: string | null, fallbackPath: string): string {
  return !shareId
    ? `${window.location.origin}${fallbackPath}`
    : `${window.location.origin}/r/${shareId}`;
}
