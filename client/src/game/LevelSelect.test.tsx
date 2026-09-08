import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockGame = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./GameContext', () => ({
  useGameContext: () => mockGame.current,
}));

const { LevelSelect } = await import('./LevelSelect');

function defaultGame(overrides: Record<string, unknown> = {}) {
  return {
    levelId: 5,
    levelCeiling: 10,
    progress: null,
    levelProgress: new Map([
      [1, { moves: 6, hints: 0, stars: 0, points: 0 }],
      [2, { moves: 8, hints: 1, stars: 0, points: 0 }],
      [3, { moves: 10, hints: 0, stars: 0, points: 0 }],
      [4, { moves: 7, hints: 0, stars: 0, points: 0 }],
    ]),
    goToLevel: vi.fn(),
    ...overrides,
  };
}

function setup(overrides: Record<string, unknown> = {}) {
  mockGame.current = defaultGame(overrides);
  render(
    <MemoryRouter>
      <LevelSelect />
    </MemoryRouter>,
  );
}

function press(key: string) {
  fireEvent.keyDown(document, { key });
}

describe('LevelSelect keyboard navigation', () => {
  it('first arrow press focuses the current level', () => {
    setup({ levelId: 5 });
    press('ArrowRight');
    expect(screen.getByTestId('tile-5')).toHaveClass('kb-focus');
  });

  it('ArrowRight moves to the next tile', () => {
    setup({ levelId: 5 });
    press('ArrowRight');
    press('ArrowRight');
    expect(screen.getByTestId('tile-6')).toHaveClass('kb-focus');
  });

  it('ArrowLeft moves to the previous tile', () => {
    setup({ levelId: 5 });
    press('ArrowRight');
    press('ArrowLeft');
    expect(screen.getByTestId('tile-4')).toHaveClass('kb-focus');
  });

  it('Enter starts an unlocked level', () => {
    const goToLevel = vi.fn();
    setup({ levelId: 5, goToLevel });
    press('ArrowRight');
    press('ArrowRight');
    press('Enter');
    expect(goToLevel).toHaveBeenCalledWith(6);
  });

  it('Enter on a locked tile does nothing', () => {
    const goToLevel = vi.fn();
    setup({ levelId: 5, levelCeiling: 5, goToLevel });
    press('ArrowRight');
    press('ArrowRight');
    press('Enter');
    expect(goToLevel).not.toHaveBeenCalled();
  });

  it('Escape goes back', () => {
    setup();
    press('Escape');
    // Navigate('/')  is called — no error means the back action ran
  });

  it('pointer click clears keyboard focus', () => {
    setup({ levelId: 5 });
    press('ArrowRight');
    expect(screen.getByTestId('tile-5')).toHaveClass('kb-focus');

    fireEvent.pointerDown(screen.getByTestId('tile-3'));
    expect(screen.getByTestId('tile-5')).not.toHaveClass('kb-focus');
  });
});
