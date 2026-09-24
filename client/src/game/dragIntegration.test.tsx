import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    pour: vi.fn(),
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
    clearSelection: vi.fn(),
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

describe('hover feedback', () => {
  function renderWithMultipleTargets() {
    localStorage.setItem('puzzle.tutorialSeen', '1');
    game.current = playing({
      state: {
        board: {
          tubes: [[1, 2, 1], [2, 1, 2], [1], []],
          capacity: 3,
          colourCount: 2,
        },
        moves: [],
        history: [],
      },
    });
    const router = createMemoryRouter(routes, { initialEntries: ['/play'] });
    render(
      <GameProvider>
        <RouterProvider router={router} />
      </GameProvider>,
    );
  }

  function startDrag(source: HTMLElement) {
    fireEvent.pointerDown(source, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(source, { clientX: 100, clientY: 130, pointerId: 1 });
  }

  function tubeBody(tube: HTMLElement): HTMLElement {
    return tube.querySelector('.flex.flex-col-reverse')!;
  }

  const HOVER_SHADOW = '0 0 0 3px rgba(74,222,128,0.85)';
  const TARGET_SHADOW = '0 0 0 2px rgba(56,189,248,0.6)';

  let originalEfp: typeof document.elementFromPoint;

  beforeEach(() => {
    originalEfp = document.elementFromPoint;
  });

  afterEach(() => {
    document.elementFromPoint = originalEfp;
  });

  function mockElementFromPoint(el: Element | null) {
    document.elementFromPoint = vi.fn().mockReturnValue(el);
  }

  it('pointer over valid target sets dropHover', () => {
    renderWithMultipleTargets();
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    mockElementFromPoint(tubes[2]);
    startDrag(tubes[0]);

    expect(tubeBody(tubes[2]).style.boxShadow).toContain(HOVER_SHADOW);
    expect(tubeBody(tubes[3]).style.boxShadow).not.toContain(HOVER_SHADOW);
  });

  it('pointer over invalid target does not set dropHover', () => {
    renderWithMultipleTargets();
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    mockElementFromPoint(tubes[1]);
    startDrag(tubes[0]);

    expect(tubeBody(tubes[1]).style.boxShadow).not.toContain(HOVER_SHADOW);
  });

  it('pointer leaving target clears dropHover', () => {
    renderWithMultipleTargets();
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    mockElementFromPoint(tubes[2]);
    startDrag(tubes[0]);
    expect(tubeBody(tubes[2]).style.boxShadow).toContain(HOVER_SHADOW);

    mockElementFromPoint(null);
    fireEvent.pointerMove(tubes[0], { clientX: 300, clientY: 300, pointerId: 1 });
    expect(tubeBody(tubes[2]).style.boxShadow).not.toContain(HOVER_SHADOW);
  });

  it('moving between valid targets transfers dropHover', () => {
    renderWithMultipleTargets();
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    mockElementFromPoint(tubes[2]);
    startDrag(tubes[0]);
    expect(tubeBody(tubes[2]).style.boxShadow).toContain(HOVER_SHADOW);

    mockElementFromPoint(tubes[3]);
    fireEvent.pointerMove(tubes[0], { clientX: 250, clientY: 200, pointerId: 1 });
    expect(tubeBody(tubes[3]).style.boxShadow).toContain(HOVER_SHADOW);
    expect(tubeBody(tubes[2]).style.boxShadow).not.toContain(HOVER_SHADOW);
    expect(tubeBody(tubes[2]).style.boxShadow).toContain(TARGET_SHADOW);
  });
});

describe('finished column lock', () => {
  function renderWithFinishedTube() {
    localStorage.setItem('puzzle.tutorialSeen', '1');
    game.current = playing({
      state: {
        board: {
          tubes: [[1, 1, 1], [2, 1, 2], [1], []],
          capacity: 3,
          colourCount: 2,
        },
        moves: [],
        history: [],
      },
    });
    const router = createMemoryRouter(routes, { initialEntries: ['/play'] });
    render(
      <GameProvider>
        <RouterProvider router={router} />
      </GameProvider>,
    );
  }

  it('drag does not initiate from a finished column', () => {
    renderWithFinishedTube();
    const tubes = screen.getAllByRole('button', { name: /tube/i });

    fireEvent.pointerDown(tubes[0], { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(tubes[0], { clientX: 100, clientY: 130, pointerId: 1 });

    expect(screen.queryByText(/drag/i)).toBeNull();
    expect((game.current as any).tapTube).not.toHaveBeenCalled();
  });

  it('keyboard activation on a finished column with nothing selected does not select it', () => {
    renderWithFinishedTube();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect((game.current as any).tapTube).not.toHaveBeenCalled();
  });
});
