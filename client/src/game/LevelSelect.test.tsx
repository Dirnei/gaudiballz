import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LevelSelect } from './LevelSelect';

function setup(overrides: Partial<Parameters<typeof LevelSelect>[0]> = {}) {
  const props = {
    levelId: 5,
    levelCeiling: 10,
    totalPoints: 0,
    progress: new Map([[1, { moves: 6, hints: 0, stars: 0, points: 0 }], [2, { moves: 8, hints: 1, stars: 0, points: 0 }], [3, { moves: 10, hints: 0, stars: 0, points: 0 }], [4, { moves: 7, hints: 0, stars: 0, points: 0 }]]),
    onSelectLevel: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<LevelSelect {...props} />);
  return props;
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
    press('ArrowRight'); // focuses 5
    press('ArrowRight'); // moves to 6
    expect(screen.getByTestId('tile-6')).toHaveClass('kb-focus');
  });

  it('ArrowLeft moves to the previous tile', () => {
    setup({ levelId: 5 });
    press('ArrowRight'); // focuses 5
    press('ArrowLeft'); // moves to 4
    expect(screen.getByTestId('tile-4')).toHaveClass('kb-focus');
  });

  it('Enter starts an unlocked level', () => {
    const props = setup({ levelId: 5 });
    press('ArrowRight'); // focuses 5
    press('ArrowRight'); // focuses 6
    press('Enter');
    expect(props.onSelectLevel).toHaveBeenCalledWith(6);
  });

  it('Enter on a locked tile does nothing', () => {
    const props = setup({ levelId: 5, levelCeiling: 5 });
    press('ArrowRight'); // focuses 5
    press('ArrowRight'); // focuses 6 (locked since ceiling is 5)
    press('Enter');
    expect(props.onSelectLevel).not.toHaveBeenCalled();
  });

  it('Escape goes back', () => {
    const props = setup();
    press('Escape');
    expect(props.onBack).toHaveBeenCalled();
  });

  it('pointer click clears keyboard focus', () => {
    setup({ levelId: 5 });
    press('ArrowRight'); // focuses 5
    expect(screen.getByTestId('tile-5')).toHaveClass('kb-focus');

    fireEvent.pointerDown(screen.getByTestId('tile-3'));
    expect(screen.getByTestId('tile-5')).not.toHaveClass('kb-focus');
  });
});
