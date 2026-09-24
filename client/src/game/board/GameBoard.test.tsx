import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBoard, startGame } from '../../engine';
import { GameBoard, type BoardGame } from './GameBoard';

function game(selected: readonly number[]): BoardGame {
  return {
    state: startGame(createBoard([[2, 3, 1], [3, 2, 1], [2, 3, 1], [], []], 3, 3)),
    selected,
    solved: false,
    stuck: false,
    undosRemaining: 5,
    hintsRemaining: 3,
    hintCooldownEnd: null,
    canHint: false,
    canUndo: false,
    moveCount: 0,
    elapsed: { elapsedMs: () => 0, start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), reset: vi.fn() },
    tapTube: vi.fn(),
    pour: vi.fn(),
    clearSelection: vi.fn(),
    undo: vi.fn(),
    useHint: vi.fn(),
    restart: vi.fn(),
  };
}

describe('every selected flask shows as picked up', () => {
  it('raises and presses each selected tube, and only those', () => {
    render(<GameBoard game={game([0, 2])} />);
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    expect(tubes.map((t) => t.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true', 'false', 'false']);
    // The glowing bar above a picked-up tube.
    const bars = tubes.map((t) => t.querySelector('.bg-sky-400') !== null);
    expect(bars).toEqual([true, false, true, false, false]);
  });
});
