import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainMenu } from './MainMenu';

function setup(overrides: Partial<Parameters<typeof MainMenu>[0]> = {}) {
  const props = {
    onPlay: vi.fn(),
    onLevelSelect: vi.fn(),
    onAchievements: vi.fn(),
    showAchievements: false,
    totalPoints: 0,
    onUnlockWithCode: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
  render(<MainMenu {...props} />);
  return props;
}

function press(key: string) {
  fireEvent.keyDown(document, { key });
}

describe('MainMenu keyboard navigation', () => {
  it('ArrowDown focuses the first item, then cycles', () => {
    setup();
    // First press focuses Play (index 0)
    press('ArrowDown');
    expect(screen.getByTestId('menu-play')).toHaveClass('kb-focus');

    // Second press focuses Level Select
    press('ArrowDown');
    expect(screen.getByTestId('menu-level-select')).toHaveClass('kb-focus');
    expect(screen.getByTestId('menu-play')).not.toHaveClass('kb-focus');

    // Third press focuses Enter code (skipping achievements since not shown)
    press('ArrowDown');
    expect(screen.getByTestId('menu-enter-code')).toHaveClass('kb-focus');
  });

  it('wraps from last to first', () => {
    setup();
    // 3 items: Play, Level Select, Enter Code. Go to last.
    press('ArrowDown'); // Play
    press('ArrowDown'); // Level Select
    press('ArrowDown'); // Enter Code
    press('ArrowDown'); // wraps to Play
    expect(screen.getByTestId('menu-play')).toHaveClass('kb-focus');
  });

  it('ArrowUp wraps from first to last', () => {
    setup();
    press('ArrowDown'); // focuses Play (index 0)
    press('ArrowUp'); // wraps to Enter Code (last)
    expect(screen.getByTestId('menu-enter-code')).toHaveClass('kb-focus');
  });

  it('Enter activates the focused item', () => {
    const props = setup();
    press('ArrowDown'); // Play
    press('ArrowDown'); // Level Select
    press('Enter');
    expect(props.onLevelSelect).toHaveBeenCalled();
  });

  it('Space activates the focused item', () => {
    const props = setup();
    press('ArrowDown'); // Play
    press(' ');
    expect(props.onPlay).toHaveBeenCalled();
  });

  it('includes achievements when shown', () => {
    setup({ showAchievements: true });
    press('ArrowDown'); // Play
    press('ArrowDown'); // Level Select
    press('ArrowDown'); // Achievements
    expect(screen.getByTestId('menu-achievements')).toHaveClass('kb-focus');
  });

  it('Escape closes code entry', () => {
    setup();
    // Open code entry via click
    fireEvent.click(screen.getByTestId('menu-enter-code'));
    expect(screen.getByTestId('code-input')).toBeInTheDocument();

    press('Escape');
    expect(screen.queryByTestId('code-input')).not.toBeInTheDocument();
  });

  it('pointer click clears keyboard focus', () => {
    setup();
    press('ArrowDown'); // Play gets focused
    expect(screen.getByTestId('menu-play')).toHaveClass('kb-focus');

    fireEvent.pointerDown(screen.getByTestId('menu-level-select'));
    expect(screen.getByTestId('menu-play')).not.toHaveClass('kb-focus');
  });
});
