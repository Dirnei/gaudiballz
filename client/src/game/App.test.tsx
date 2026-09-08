import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const game = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./useGame', () => ({ useGame: () => game.current }));

const { App } = await import('./App');

/**
 * A game in whatever state the test needs. Only the fields App reads matter; the board is
 * left empty because none of these tests are about the board.
 */
function playing(overrides: Record<string, unknown> = {}) {
  return {
    levelId: 26,
    levelCode: 'ABC123',
    levelCeiling: 40,
    info: { parMoves: 30, chapterNote: null },
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
    progress: { levelsCompleted: 26, highestCompleted: 26, levels: [] },
    loggedIn: vi.fn(),
    logOut: vi.fn(),
    registered: vi.fn(),
    unlockWithCode: vi.fn(),
    ballUnlocks: [],
    ensureBallUnlocks: vi.fn(),
    chooseBall: vi.fn(),
    solved: false,
    stuck: false,
    undosRemaining: 5,
    hintsUsed: 0,
    hinted: null,
    useHint: vi.fn(),
    canUndo: false,
    moveCount: 24,
    tapTube: vi.fn(),
    undo: vi.fn(),
    restart: vi.fn(),
    goToLevel: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  game.current = playing();
});

/**
 * The product stance: the game has nothing to sell, so it never interrupts a player. Earning
 * a ball is something to find, not something to be handed.
 */
describe('nothing announces an earned ball', () => {
  it('says nothing about balls on the win screen', () => {
    // Level 26 is where a new colour joins, so this completion earns one.
    game.current = playing({ solved: true });

    render(<App />);

    expect(screen.getByText('Solved')).toBeInTheDocument();

    const overlay = screen.getByText('Solved').closest('div')!;
    expect(overlay.textContent).not.toMatch(/ball|colour|color|unlocked|new/i);
  });

  it('offers only the next level and another go when a level is finished', () => {
    game.current = playing({ solved: true });

    render(<App />);

    // Scoped to the win card, since the footer carries its own next-level control.
    const card = screen.getByText('Solved').closest('div')!;
    const offered = within(card)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(offered).toEqual(['Next level', 'Play again']);
  });

  it('leaves the account control unchanged whatever has been earned', () => {
    const label = (highestCompleted: number) => {
      game.current = playing({
        progress: { levelsCompleted: highestCompleted, highestCompleted, levels: [] },
      });
      const { unmount } = render(<App />);
      const button = screen.getByRole('button', { name: /logged in as dirnei/i });
      const html = button.outerHTML;
      unmount();
      return html;
    };

    // One player has earned three colours, the other all thirteen. The control that opens
    // the panel must not differ: no dot, no badge, no count.
    expect(label(1)).toBe(label(200));
  });

  it('carries no badge on the account control', () => {
    render(<App />);

    const button = screen.getByRole('button', { name: /logged in as dirnei/i });

    expect(button.textContent).not.toMatch(/new|!|•/i);
    expect(button.textContent).toContain('dirnei');
  });
});
