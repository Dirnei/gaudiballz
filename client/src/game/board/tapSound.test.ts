import { describe, expect, it } from 'vitest';
import { createBoard } from '../../engine';
import { tapSound } from './tapSound';

// Tube 0 is finished; 1 and 2 are mixed; 3 is the spare.
const board = createBoard([[1, 1, 1], [2, 3, 2], [3, 2, 3], []], 3, 3);

describe('tapSound', () => {
  it('picks up from a flask when nothing is held', () => {
    expect(tapSound(board, [], 1)).toBe('pickup');
  });

  it('is silent when putting balls back down', () => {
    expect(tapSound(board, [1], 1)).toBeNull();
  });

  it('leaves a pour to the drop sound', () => {
    expect(tapSound(board, [1], 3)).toBeNull();
  });

  it('treats a mis-tap that picks up the other flask as a pick-up, not an error', () => {
    // Top 2 onto top 3 is illegal, so flask 2 is picked up instead.
    expect(tapSound(board, [1], 2)).toBe('pickup');
  });

  it('buzzes on a finished flask while holding balls', () => {
    expect(tapSound(board, [1], 0)).toBe('invalid');
  });

  it('is silent on a finished or empty flask with nothing held', () => {
    expect(tapSound(board, [], 0)).toBeNull();
    expect(tapSound(board, [], 3)).toBeNull();
  });

  it('picks up again when a full matching flask joins the selection', () => {
    // Flask 1 is full, unfinished and topped with the held colour, so it joins the selection.
    const multi = createBoard([[1, 2, 2], [3, 1, 2], [1, 3, 3], [], []], 3, 3);

    expect(tapSound(multi, [0], 1)).toBe('pickup');
  });
});
