import type { Board } from '../../engine';
import { resolveTap } from './resolveTap';

/**
 * The sound a tap makes before it is applied, from the same decision the tap itself uses.
 *
 * Pours return null: the drop, flask-full and solved sounds come from the move landing, so a
 * pour by drag, keyboard or hint sounds the same as one by tap. Only a tap that changes nothing
 * while balls are held is an error; a mis-tap that picks up the other flask is the game being
 * helpful, and sounds like any other pick-up.
 */
export function tapSound(board: Board, selected: readonly number[], index: number): 'pickup' | 'invalid' | null {
  const outcome = resolveTap(board, selected, index);
  if (outcome.kind === 'pour' || selected.includes(index)) {
    return null;
  }
  if (outcome.selected.length > 0) {
    return 'pickup';
  }
  return selected.length > 0 ? 'invalid' : null;
}
