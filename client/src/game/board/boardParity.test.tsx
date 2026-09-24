import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../identity', async () => {
  const actual = await vi.importActual<typeof import('../identity')>('../identity');
  return { ...actual, ensureIdentity: vi.fn().mockResolvedValue(null) };
});

vi.mock('../progress', async () => {
  const actual = await vi.importActual<typeof import('../progress')>('../progress');
  return { ...actual, drain: vi.fn(), loadProgress: vi.fn().mockResolvedValue(null), reportAttemptEnded: vi.fn(), recordCompletion: vi.fn().mockResolvedValue({ newAchievements: [], newBadges: [], attemptStars: 0, attemptPoints: 0, starDelta: 0, replayBonus: 0, timeBonus: 0, noHintBonus: 0, firstClearBonus: 0, streakBonus: 0, rankUp: null }) };
});

const { routes } = await import('../App');
const { GameProvider } = await import('../GameContext');

/**
 * The `shared-game-board` promise, checked end to end: the same input on the same board gives
 * the same result in the campaign, the daily challenge and the tutorial.
 *
 * The tutorial's board is fixed, so the other two are served that same board.
 */
const TUTORIAL_TUBES = [[1, 2, 1], [2, 1, 2], []];

type Mode = 'play' | 'daily' | 'tutorial';
const MODES: Mode[] = ['play', 'daily', 'tutorial'];

function serve(tubes: number[][]) {
  const level = { levelId: 1, tubes, capacity: 3, colourCount: Math.max(...tubes.flat()), parMoves: 10, timeTargetMs: 30000, spareTubes: 1, chapterNote: null, code: 'TEST' };
  const daily = { date: '2026-09-24', tubes, capacity: 3, colourCount: level.colourCount, parMoves: 10, timeTargetMs: 30000 };
  globalThis.fetch = vi.fn().mockImplementation((url: string) => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(String(url).includes('/daily/') ? { ...daily } : { ...level }),
  })) as unknown as typeof fetch;
}

async function open(mode: Mode): Promise<HTMLElement[]> {
  const router = createMemoryRouter(routes, { initialEntries: [`/${mode}`] });
  render(
    <GameProvider>
      <RouterProvider router={router} />
    </GameProvider>,
  );
  await waitFor(() => expect(screen.getAllByRole('button', { name: /tube/i }).length).toBeGreaterThan(0));
  return tubes();
}

function tubes(): HTMLElement[] {
  return screen.getAllByRole('button', { name: /tube/i });
}

function tap(el: HTMLElement) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: 100, clientY: 100, pointerId: 1 });
}

function drag(from: HTMLElement, to: HTMLElement) {
  document.elementFromPoint = vi.fn().mockReturnValue(to);
  fireEvent.pointerDown(from, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(from, { clientX: 100, clientY: 140, pointerId: 1 });
  fireEvent.pointerUp(from, { clientX: 100, clientY: 140, pointerId: 1 });
}

/** What the player can see of the board: each tube's fill, and which one is picked up. */
function snapshot() {
  return tubes().map((tube) => `${tube.getAttribute('aria-label')}|${tube.getAttribute('aria-pressed')}`);
}

const originalFetch = globalThis.fetch;
const originalEfp = document.elementFromPoint;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('puzzle.tutorialSeen', '1');
  // jsdom does not lay anything out, so it has no scrolling to do.
  Element.prototype.scrollIntoView = vi.fn();
  serve(TUTORIAL_TUBES);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  document.elementFromPoint = originalEfp;
});

describe('identical board interaction in every mode', () => {
  async function playSequence(mode: Mode) {
    await open(mode);
    const after: string[][] = [];

    tap(tubes()[0]);              // pick up tube 0
    after.push(snapshot());
    tap(tubes()[1]);              // illegal pour: picks up tube 1 instead
    after.push(snapshot());
    tap(tubes()[2]);              // pour 1 -> 2
    after.push(snapshot());
    drag(tubes()[0], tubes()[1]); // drag pour 0 -> 1
    after.push(snapshot());
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'Enter' }); // pick up tube 0
    after.push(snapshot());
    fireEvent.keyDown(document, { key: '3' });     // pour 0 -> 2
    after.push(snapshot());
    fireEvent.keyDown(document, { key: '2' });     // pick up tube 1
    fireEvent.keyDown(document, { key: 'Escape' }); // put it down
    after.push(snapshot());

    return after;
  }

  it('gives the same selection and board after taps, a drag and keys', async () => {
    const results: Record<string, string[][]> = {};
    for (const mode of MODES) {
      const view = await playSequence(mode);
      results[mode] = view;
      document.body.innerHTML = '';
    }

    expect(results.daily).toEqual(results.play);
    expect(results.tutorial).toEqual(results.play);
    // And the sequence actually did something.
    expect(results.play[0]).not.toEqual(results.play[5]);
  });
});

describe('the daily challenge follows the board rules the campaign always had', () => {
  // Tube 0 is finished.
  const WITH_FINISHED = [[1, 1, 1], [2, 3, 2], [3, 2, 3], []];

  beforeEach(() => serve(WITH_FINISHED));

  it('never picks up a finished column by tap', async () => {
    await open('daily');

    tap(tubes()[0]);

    expect(tubes()[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('never picks up a finished column by keyboard', async () => {
    await open('daily');

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(tubes()[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('never starts a drag from a finished column', async () => {
    await open('daily');

    document.elementFromPoint = vi.fn().mockReturnValue(tubes()[3]);
    fireEvent.pointerDown(tubes()[0], { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(tubes()[0], { clientX: 100, clientY: 140, pointerId: 1 });

    const body = tubes()[3].querySelector<HTMLElement>('.flex.flex-col-reverse')!;
    expect(body.style.boxShadow).not.toContain('0 0 0 3px rgba(74,222,128,0.85)');
    expect(body.style.boxShadow).not.toContain('0 0 0 2px rgba(56,189,248,0.6)');
  });

  it('highlights the drop target under the pointer while dragging', async () => {
    await open('daily');

    document.elementFromPoint = vi.fn().mockReturnValue(tubes()[3]);
    fireEvent.pointerDown(tubes()[1], { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(tubes()[1], { clientX: 100, clientY: 140, pointerId: 1 });

    const body = tubes()[3].querySelector<HTMLElement>('.flex.flex-col-reverse')!;
    expect(body.style.boxShadow).toContain('0 0 0 3px rgba(74,222,128,0.85)');
  });
});
