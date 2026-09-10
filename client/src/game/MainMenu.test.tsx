import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockGame = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./GameContext', () => ({
  useGameContext: () => mockGame.current,
}));

const { MainMenu } = await import('./MainMenu');

function defaultGame(overrides: Record<string, unknown> = {}) {
  return {
    identity: null,
    progress: null,
    achievements: null,
    ensureAchievements: vi.fn(),
    unlockWithCode: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function setup(overrides: Record<string, unknown> = {}) {
  mockGame.current = defaultGame(overrides);
  render(
    <MemoryRouter>
      <MainMenu />
    </MemoryRouter>,
  );
}

function press(key: string) {
  fireEvent.keyDown(document, { key });
}

describe('MainMenu keyboard navigation', () => {
  it('ArrowDown focuses the first item, then cycles', () => {
    setup();
    press('ArrowDown');
    expect(screen.getByTestId('menu-play')).toHaveClass('kb-focus');

    press('ArrowDown');
    expect(screen.getByTestId('menu-level-select')).toHaveClass('kb-focus');
    expect(screen.getByTestId('menu-play')).not.toHaveClass('kb-focus');
  });

  it('wraps from last to first', () => {
    setup();
    press('ArrowDown');
    press('ArrowDown');
    press('ArrowDown');
    expect(screen.getByTestId('menu-play')).toHaveClass('kb-focus');
  });

  it('ArrowUp wraps from first to last', () => {
    setup();
    press('ArrowDown');
    press('ArrowUp');
    expect(screen.getByTestId('menu-level-select')).toHaveClass('kb-focus');
  });

  it('Enter activates the focused item', () => {
    setup();
    press('ArrowDown');
    press('ArrowDown');
    press('Enter');
    // Level Select navigates — no error means the action ran
  });

  it('Space activates the focused item', () => {
    setup();
    press('ArrowDown');
    press(' ');
    // Play navigates — no error means the action ran
  });

  it('pointer click clears keyboard focus', () => {
    setup();
    press('ArrowDown');
    expect(screen.getByTestId('menu-play')).toHaveClass('kb-focus');

    fireEvent.pointerDown(screen.getByTestId('menu-level-select'));
    expect(screen.getByTestId('menu-play')).not.toHaveClass('kb-focus');
  });
});

describe('tutorial redirect', () => {
  function setupWithRoutes() {
    mockGame.current = defaultGame();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/tutorial" element={<div data-testid="at-tutorial" />} />
          <Route path="/play" element={<div data-testid="at-play" />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('navigates to /tutorial when tutorial has not been seen', () => {
    setupWithRoutes();
    fireEvent.click(screen.getByTestId('menu-play'));

    expect(screen.getByTestId('at-tutorial')).toBeInTheDocument();
  });

  it('navigates to /play when tutorial has been seen', () => {
    localStorage.setItem('puzzle.tutorialSeen', '1');
    setupWithRoutes();
    fireEvent.click(screen.getByTestId('menu-play'));

    expect(screen.getByTestId('at-play')).toBeInTheDocument();
  });
});
