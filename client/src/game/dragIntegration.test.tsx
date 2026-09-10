import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

const game = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./useGame', () => ({ useGame: () => game.current }));

const { routes } = await import('./App');
const { GameProvider } = await import('./GameContext');

function playing(overrides: Record<string, unknown> = {}) {
  return {
    levelId: 1,
    levelCode: 'ABC123',
    levelCeiling: 40,
    info: { parMoves: 10, timeTargetMs: 30000, chapterNote: null },
    load: 'ready',
    state: {
      board: {
        tubes: [[1, 2, 1], [2, 1, 2], []],
        capacity: 3,
        colourCount: 2,
      },
      moves: [],
      history: [],
    },
    selected: null,
    identity: null,
    progress: null,
    levelProgress: new Map(),
    loggedIn: vi.fn(),
    logOut: vi.fn(),
    registered: vi.fn(),
    unlockWithCode: vi.fn(),
    ballUnlocks: [],
    ensureBallUnlocks: vi.fn(),
    achievements: null,
    ensureAchievements: vi.fn(),
    attemptStars: 0,
    attemptPoints: 0,
    starDelta: 0,
    replayBonus: 0,
    timeBonus: 0,
    newAchievements: [],
    clearNewAchievements: vi.fn(),
    chooseBall: vi.fn(),
    solved: false,
    stuck: false,
    undosRemaining: 5,
    hintsRemaining: 3,
    hintCooldownEnd: null,
    canHint: true,
    hintsUsed: 0,
    hinted: null,
    useHint: vi.fn(),
    canUndo: false,
    moveCount: 0,
    elapsed: { elapsedMs: () => 0, start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), reset: vi.fn() },
    tapTube: vi.fn(),
    undo: vi.fn(),
    restart: vi.fn(),
    goToLevel: vi.fn(),
    ...overrides,
  };
}

function renderPlay() {
  localStorage.setItem('puzzle.tutorialSeen', '1');
  game.current = playing();
  const router = createMemoryRouter(routes, { initialEntries: ['/play'] });
  render(
    <GameProvider>
      <RouterProvider router={router} />
    </GameProvider>,
  );
}

beforeEach(() => {
  game.current = playing();
  localStorage.setItem('puzzle.tutorialSeen', '1');
});

describe('drag-and-drop integration', () => {
  it('tap still works (press and release without movement)', () => {
    renderPlay();
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    fireEvent.pointerDown(tubes[0], { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(tubes[0], { clientX: 100, clientY: 100, pointerId: 1 });

    expect((game.current as any).tapTube).toHaveBeenCalledWith(0);
  });

  it('tubes have data-tube-index attributes', () => {
    renderPlay();
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    expect(tubes[0]).toHaveAttribute('data-tube-index', '0');
    expect(tubes[1]).toHaveAttribute('data-tube-index', '1');
    expect(tubes[2]).toHaveAttribute('data-tube-index', '2');
  });
});
