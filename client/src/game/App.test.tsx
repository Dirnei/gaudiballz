import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

const game = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./useGame', () => ({ useGame: () => game.current }));

const { routes } = await import('./App');
const { GameProvider } = await import('./GameContext');

function playing(overrides: Record<string, unknown> = {}) {
  return {
    levelId: 26,
    levelCode: 'ABC123',
    levelCeiling: 40,
    info: { parMoves: 30, timeTargetMs: 90000, chapterNote: null },
    load: 'ready',
    state: null,
    selected: null,
    identity: {
      playerId: 'p1',
      token: 't',
      isAnonymous: false,
      username: 'dirnei',
      ball: null,
    },
    progress: { levelsCompleted: 26, highestCompleted: 26, totalPoints: 0, levels: [] },
    levelProgress: new Map<number, { moves: number; hints: number; stars: number; points: number }>(),
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
    moveCount: 24,
    elapsed: { elapsedMs: () => 0, start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), reset: vi.fn() },
    tapTube: vi.fn(),
    undo: vi.fn(),
    restart: vi.fn(),
    goToLevel: vi.fn(),
    ...overrides,
  };
}

function renderApp(initialRoute = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialRoute] });
  return render(
    <GameProvider>
      <RouterProvider router={router} />
    </GameProvider>,
  );
}

beforeEach(() => {
  game.current = playing();
});

async function goToPlay() {
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  return screen.findByRole('button', { name: /back to menu/i });
}

async function goToLevelSelect() {
  fireEvent.click(screen.getByRole('button', { name: 'Level Select' }));
  return screen.findByRole('heading', { name: 'Level Select' });
}

describe('nothing announces an earned ball', () => {
  it('says nothing about balls on the win screen', async () => {
    game.current = playing({ solved: true });

    renderApp();
    await goToPlay();

    expect(screen.getByText('Solved')).toBeInTheDocument();

    const overlay = screen.getByText('Solved').closest('div')!;
    expect(overlay.textContent).not.toMatch(/ball|colour|color|unlocked|new/i);
  });

  it('offers only the next level and another go when a level is finished', async () => {
    game.current = playing({ solved: true });

    renderApp();
    await goToPlay();

    const card = screen.getByText('Solved').closest('div')!;
    const offered = within(card)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(offered).toEqual(['Next level', 'Play again']);
  });

  it('leaves the account control unchanged whatever has been earned', async () => {
    const label = async (highestCompleted: number) => {
      game.current = playing({
        progress: { levelsCompleted: highestCompleted, highestCompleted, levels: [] },
      });
      const { unmount } = renderApp();
      await goToPlay();
      const button = screen.getByRole('button', { name: /logged in as dirnei/i });
      const html = button.outerHTML;
      unmount();
      return html;
    };

    expect(await label(1)).toBe(await label(200));
  });

  it('carries no badge on the account control', async () => {
    renderApp();

    const button = await screen.findByRole('button', { name: /logged in as dirnei/i });

    expect(button.textContent).not.toMatch(/new|!|•/i);
    expect(button.textContent).toContain('dirnei');
  });
});

describe('the hint control shows its budget', () => {
  const hintButton = () =>
    screen.getByRole('button', { name: /show me a move|no hints left/i });

  const hintControl = () => hintButton().parentElement!;

  it('shows how many hints are left', async () => {
    game.current = playing({ hintsRemaining: 3 });
    renderApp();
    await goToPlay();

    expect(hintButton().textContent).toContain('3');
  });

  it('names the remaining count so it is not colour or position alone', async () => {
    game.current = playing({ hintsRemaining: 2 });
    renderApp();
    await goToPlay();

    expect(hintButton()).toHaveAttribute('aria-label', 'Show me a move, 2 left');
  });

  it('is disabled while the cooldown runs, and says so', async () => {
    game.current = playing({ hintCooldownEnd: Date.now() + 30_000, canHint: false });
    renderApp();
    await goToPlay();

    expect(hintButton()).toBeDisabled();
    expect(hintButton().getAttribute('aria-label')).toMatch(/available shortly/i);
  });

  it('is disabled once the budget is spent', async () => {
    game.current = playing({ hintsRemaining: 0, canHint: false });
    renderApp();
    await goToPlay();

    expect(hintButton()).toBeDisabled();
    expect(hintButton()).toHaveAttribute('aria-label', 'No hints left this attempt');
  });

  it('draws the wait while one is running', async () => {
    game.current = playing({ hintCooldownEnd: Date.now() + 30_000, canHint: false });
    renderApp();
    await goToPlay();

    expect(hintControl().querySelector('svg[viewBox="0 0 56 56"]')).not.toBeNull();
  });

  it('draws no wait once the budget is spent', async () => {
    game.current = playing({
      hintsRemaining: 0,
      hintCooldownEnd: Date.now() + 30_000,
      canHint: false,
    });
    renderApp();
    await goToPlay();

    expect(hintControl().querySelector('svg[viewBox="0 0 56 56"]')).toBeNull();
  });

  it('asks for a hint when it is available', async () => {
    const useHint = vi.fn();
    game.current = playing({ useHint });
    renderApp();
    await goToPlay();

    fireEvent.click(hintButton());

    expect(useHint).toHaveBeenCalled();
  });
});

describe('the level select can scroll', () => {
  it('lets every flex ancestor of the grid shrink below its content', async () => {
    game.current = playing({ levelCeiling: 120 });
    renderApp();
    await goToLevelSelect();

    const scroller = document.querySelector('.overflow-y-auto');
    expect(scroller).not.toBeNull();

    const rigid: string[] = [];
    for (
      let el = scroller!.parentElement;
      el !== null && !el.className.includes('h-full');
      el = el.parentElement
    ) {
      const cls = el.className;
      if (cls.includes('flex-1') && !cls.includes('min-h-0')) {
        rigid.push(cls);
      }
    }

    expect(rigid).toEqual([]);
  });

  it('gives the grid a scroll container in the first place', async () => {
    game.current = playing({ levelCeiling: 120 });
    renderApp();
    await goToLevelSelect();

    const scroller = document.querySelector('.overflow-y-auto');

    expect(scroller).not.toBeNull();
    expect(scroller!.querySelectorAll('.aspect-square').length).toBeGreaterThan(100);
  });
});
