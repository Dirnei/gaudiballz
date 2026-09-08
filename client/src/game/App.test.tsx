import { fireEvent, render, screen, within } from '@testing-library/react';
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
    levelProgress: new Map<number, { moves: number; hints: number }>(),
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
    hintsRemaining: 3,
    hintCooldownEnd: null,
    canHint: true,
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
 * The app opens on the main menu, so anything about another screen has to walk there first.
 * The screens cross-fade through AnimatePresence, so the arrival has to be awaited rather
 * than assumed.
 */
async function goToPlay() {
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  return screen.findByRole('button', { name: /logged in as dirnei/i });
}

async function goToLevelSelect() {
  fireEvent.click(screen.getByRole('button', { name: 'Level Select' }));
  return screen.findByRole('heading', { name: 'Level Select' });
}

/**
 * The product stance: the game has nothing to sell, so it never interrupts a player. Earning
 * a ball is something to find, not something to be handed.
 */
describe('nothing announces an earned ball', () => {
  it('says nothing about balls on the win screen', async () => {
    // Level 26 is where a new colour joins, so this completion earns one.
    game.current = playing({ solved: true });

    render(<App />);
    await goToPlay();

    expect(screen.getByText('Solved')).toBeInTheDocument();

    const overlay = screen.getByText('Solved').closest('div')!;
    expect(overlay.textContent).not.toMatch(/ball|colour|color|unlocked|new/i);
  });

  it('offers only the next level and another go when a level is finished', async () => {
    game.current = playing({ solved: true });

    render(<App />);
    await goToPlay();

    // Scoped to the win card, since the footer carries its own next-level control.
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
      const { unmount } = render(<App />);
      const button = await goToPlay();
      const html = button.outerHTML;
      unmount();
      return html;
    };

    // One player has earned three colours, the other all thirteen. The control that opens
    // the panel must not differ: no dot, no badge, no count.
    expect(await label(1)).toBe(await label(200));
  });

  it('carries no badge on the account control', async () => {
    render(<App />);

    const button = await goToPlay();

    expect(button.textContent).not.toMatch(/new|!|•/i);
    expect(button.textContent).toContain('dirnei');
  });
});

/**
 * A column flex item defaults to `min-height: auto`, which means it refuses to shrink below
 * its own content. A scroll container nested inside such items is handed the full height of
 * its content, so it never has anything to scroll — it just overflows until some ancestor
 * clips it.
 *
 * Measured in a real browser at a 430x932 viewport with 125 tiles: the grid was 1430px tall
 * inside a 932px app, `scrollHeight === clientHeight`, and nothing moved. Making only one of
 * the two flex ancestors shrinkable changed nothing; both had to be.
 *
 * jsdom performs no layout, so the heights cannot be asserted here. What can be asserted is
 * the rule that produced them: every flex item between the scroll container and the
 * height-bounded root must be allowed to shrink.
 */
/**
 * The hint budget, as the player meets it. The numbers themselves are proven in
 * attempt.test.ts; what matters here is that the control tells the truth about them.
 */
describe('the hint control shows its budget', () => {
  const hintButton = () =>
    screen.getByRole('button', { name: /show me a move|no hints left/i });

  /**
   * The button plus its overlay. The cooldown ring is a sibling of the button rather than a
   * child, because a disabled button is drawn at 30% opacity and would take the ring down
   * with it — exactly when the ring is the thing worth reading.
   */
  const hintControl = () => hintButton().parentElement!;

  it('shows how many hints are left', async () => {
    game.current = playing({ hintsRemaining: 3 });
    render(<App />);
    await goToPlay();

    expect(hintButton().textContent).toContain('3');
  });

  it('names the remaining count so it is not colour or position alone', async () => {
    game.current = playing({ hintsRemaining: 2 });
    render(<App />);
    await goToPlay();

    expect(hintButton()).toHaveAttribute('aria-label', 'Show me a move, 2 left');
  });

  it('is disabled while the cooldown runs, and says so', async () => {
    game.current = playing({ hintCooldownEnd: Date.now() + 30_000, canHint: false });
    render(<App />);
    await goToPlay();

    expect(hintButton()).toBeDisabled();
    expect(hintButton().getAttribute('aria-label')).toMatch(/available shortly/i);
  });

  it('is disabled once the budget is spent', async () => {
    game.current = playing({ hintsRemaining: 0, canHint: false });
    render(<App />);
    await goToPlay();

    expect(hintButton()).toBeDisabled();
    expect(hintButton()).toHaveAttribute('aria-label', 'No hints left this attempt');
  });

  it('draws the wait while one is running', async () => {
    game.current = playing({ hintCooldownEnd: Date.now() + 30_000, canHint: false });
    render(<App />);
    await goToPlay();

    expect(hintControl().querySelector('svg')).not.toBeNull();
  });

  /** A wait that cannot end in a hint would promise something that is not coming. */
  it('draws no wait once the budget is spent', async () => {
    game.current = playing({
      hintsRemaining: 0,
      hintCooldownEnd: Date.now() + 30_000,
      canHint: false,
    });
    render(<App />);
    await goToPlay();

    expect(hintControl().querySelector('svg')).toBeNull();
  });

  it('asks for a hint when it is available', async () => {
    const useHint = vi.fn();
    game.current = playing({ useHint });
    render(<App />);
    await goToPlay();

    fireEvent.click(hintButton());

    expect(useHint).toHaveBeenCalled();
  });
});

describe('the level select can scroll', () => {
  it('lets every flex ancestor of the grid shrink below its content', async () => {
    game.current = playing({ levelCeiling: 120 });
    render(<App />);
    await goToLevelSelect();

    const scroller = document.querySelector('.overflow-y-auto');
    expect(scroller).not.toBeNull();

    // Up to the element that fixes the app's height; that one is bounded already.
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
    render(<App />);
    await goToLevelSelect();

    const scroller = document.querySelector('.overflow-y-auto');

    expect(scroller).not.toBeNull();
    expect(scroller!.querySelectorAll('.aspect-square').length).toBeGreaterThan(100);
  });
});
