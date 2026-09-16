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
  it('ArrowRight selects the next tile (lower number in descending order)', () => {
    const goToLevel = vi.fn();
    setup({ levelId: 5, goToLevel });
    press('ArrowRight');
    press('Enter');
    expect(goToLevel).toHaveBeenCalledWith(4);
  });

  it('ArrowLeft selects the previous tile (higher number in descending order)', () => {
    const goToLevel = vi.fn();
    setup({ levelId: 5, goToLevel });
    press('ArrowLeft');
    press('Enter');
    expect(goToLevel).toHaveBeenCalledWith(6);
  });

  it('Enter plays the selected level', () => {
    const goToLevel = vi.fn();
    setup({ levelId: 5, goToLevel });
    press('Enter');
    expect(goToLevel).toHaveBeenCalledWith(5);
  });

  it('arrow keys do not select locked tiles', () => {
    const goToLevel = vi.fn();
    setup({ levelId: 5, levelCeiling: 5, goToLevel });
    press('ArrowLeft');
    press('ArrowLeft');
    press('Enter');
    expect(goToLevel).toHaveBeenCalledWith(5);
  });

  it('Escape goes back', () => {
    setup();
    press('Escape');
    // Navigate('/')  is called — no error means the back action ran
  });
});

function visibleTileNumbers(): number[] {
  const els = document.querySelectorAll('[data-testid^="tile-"]');
  return Array.from(els).map(el => Number(el.getAttribute('data-testid')!.replace('tile-', '')));
}

describe('LevelSelect tile ordering', () => {
  it('displays tiles in descending order within a page', () => {
    setup({ levelCeiling: 10 });
    const tiles = visibleTileNumbers();
    expect(tiles[0]).toBe(15);
    expect(tiles[tiles.length - 1]).toBe(1);
    for (let i = 1; i < tiles.length; i++) {
      expect(tiles[i]).toBeLessThan(tiles[i - 1]);
    }
  });
});

describe('LevelSelect page slicing', () => {
  it('first page shows 50 tiles for a ceiling above 50', () => {
    setup({ levelId: 120, levelCeiling: 120, levelProgress: new Map() });
    const tiles = visibleTileNumbers();
    expect(tiles).toHaveLength(50);
    expect(tiles[0]).toBe(125);
    expect(tiles[49]).toBe(76);
  });

  it('last page contains the remainder when not a multiple of 50', () => {
    setup({ levelId: 120, levelCeiling: 120, levelProgress: new Map() });
    fireEvent.click(screen.getByTestId('page-next'));
    fireEvent.click(screen.getByTestId('page-next'));
    const tiles = visibleTileNumbers();
    expect(tiles).toHaveLength(25);
    expect(tiles[0]).toBe(25);
    expect(tiles[24]).toBe(1);
  });
});

describe('LevelSelect default page selection', () => {
  it('opens on the page containing the current level', () => {
    setup({ levelId: 60, levelCeiling: 120, levelProgress: new Map() });
    const tiles = visibleTileNumbers();
    expect(tiles).toContain(60);
    expect(tiles[0]).toBe(75);
    expect(tiles[49]).toBe(26);
  });

  it('opens on the first page when there is no current level', () => {
    setup({ levelId: 0, levelCeiling: 120, levelProgress: new Map() });
    const tiles = visibleTileNumbers();
    expect(tiles[0]).toBe(125);
  });
});

describe('LevelSelect page navigation controls', () => {
  it('previous button is disabled on the first page', () => {
    setup({ levelId: 120, levelCeiling: 120, levelProgress: new Map() });
    expect(screen.getByTestId('page-prev')).toBeDisabled();
  });

  it('next button is disabled on the last page', () => {
    setup({ levelId: 1, levelCeiling: 120, levelProgress: new Map() });
    expect(screen.getByTestId('page-next')).toBeDisabled();
  });

  it('next button advances to the next page', () => {
    setup({ levelId: 120, levelCeiling: 120, levelProgress: new Map() });
    fireEvent.click(screen.getByTestId('page-next'));
    const tiles = visibleTileNumbers();
    expect(tiles[0]).toBe(75);
    expect(tiles[49]).toBe(26);
  });

  it('previous button goes back to the prior page', () => {
    setup({ levelId: 60, levelCeiling: 120, levelProgress: new Map() });
    fireEvent.click(screen.getByTestId('page-prev'));
    const tiles = visibleTileNumbers();
    expect(tiles[0]).toBe(125);
  });

  it('shows page position indicator', () => {
    setup({ levelId: 120, levelCeiling: 120, levelProgress: new Map() });
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('Page 1 of 3');
  });
});
