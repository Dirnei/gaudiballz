import { isLegal, topColour, topRunLength, type Board, type Move } from '../../engine';
import { isComplete } from '../isComplete';

/** What a tap on a tube does: change what is picked up, or pour. */
export type TapOutcome =
  | { readonly kind: 'select'; readonly selected: readonly number[] }
  | { readonly kind: 'pour'; readonly moves: readonly Move[] };

function canPickUp(board: Board, index: number): boolean {
  const tube = board.tubes[index];
  return tube.length > 0 && !isComplete(tube, board.capacity);
}

/** An illegal target is picked up instead, so a mis-tap never costs a second tap. */
function redirect(board: Board, index: number): TapOutcome {
  return { kind: 'select', selected: canPickUp(board, index) ? [index] : [] };
}

/**
 * Decides what a tap on tube `index` does, given the tubes already picked up in the order
 * they were picked.
 *
 * Several tubes can be picked up at once: a full tube whose top colour matches the first
 * picked-up tube joins the selection, since a full tube could never take a pour anyway.
 * With several picked up, a tap pours from all of them - but only into a tube that takes
 * every ball, so a multi-pour never splits. With one picked up, pouring is exactly the old
 * two-tap pour, partial pours included.
 *
 * Pure, so every branch is tested against real boards rather than through a screen.
 */
export function resolveTap(board: Board, selected: readonly number[], index: number): TapOutcome {
  if (selected.includes(index)) {
    return { kind: 'select', selected: [] };
  }

  if (selected.length === 0) {
    return redirect(board, index);
  }

  const tube = board.tubes[index];
  const colour = topColour(board.tubes[selected[0]]);

  if (tube.length === board.capacity && !isComplete(tube, board.capacity) && topColour(tube) === colour) {
    return { kind: 'select', selected: [...selected, index] };
  }

  if (selected.length === 1) {
    const move = { from: selected[0], to: index };
    return isLegal(board, move) ? { kind: 'pour', moves: [move] } : redirect(board, index);
  }

  const needed = selected.reduce((sum, from) => sum + topRunLength(board.tubes[from]), 0);
  const fits = tube.length === 0
    || (topColour(tube) === colour && board.capacity - tube.length >= needed);

  return fits
    ? { kind: 'pour', moves: selected.map((from) => ({ from, to: index })) }
    : redirect(board, index);
}
