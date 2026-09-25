import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { REPLAY_STEP_MS } from './useReplay';

const context = vi.hoisted(() => ({ unlockWithCode: vi.fn() }));

vi.mock('./GameContext', () => ({ useGameContext: () => context }));
vi.mock('./identity', () => ({ API: '' }));

const { SharedResultPage } = await import('./SharedResultPage');

function levelResult(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'level',
    level: 26,
    code: 'ABC123',
    stars: 2,
    moves: 28,
    hints: 0,
    elapsedTimeMs: 95_000,
    par: 30,
    timeTargetMs: 90_000,
    player: { username: 'dirnei', ball: 3 },
    board: { tubes: [[1, 2, 1, 2], [2, 1, 2, 1], []], capacity: 4 },
    rank: { position: 3, total: 6 },
    ...overrides,
  };
}

function dailyResult(overrides: Record<string, unknown> = {}) {
  return {
    ...levelResult(),
    kind: 'daily',
    level: undefined,
    code: undefined,
    date: '2026-09-25',
    isToday: true,
    ...overrides,
  };
}

function serve(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: status === 200,
    status,
    json: async () => body,
  })));
}

function renderPage(id = 'k3F9x2Ab') {
  const router = createMemoryRouter(
    [
      { path: '/r/:id', element: <SharedResultPage /> },
      { path: '/play', element: <p>playing</p> },
      { path: '/daily', element: <p>daily screen</p> },
      { path: '/', element: <p>home</p> },
    ],
    { initialEntries: [`/r/${id}`] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  context.unlockWithCode.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shared result page', () => {
  it('asks the server for the result in the link', async () => {
    serve(levelResult());

    renderPage('zz99Yy11');

    await screen.findByText('dirnei');
    expect(fetch).toHaveBeenCalledWith('/api/v1/shares/zz99Yy11');
  });

  it('shows who solved which level, and the numbers', async () => {
    serve(levelResult());

    renderPage();

    expect(await screen.findByText('dirnei')).toBeInTheDocument();
    expect(screen.getByText('solved Level 26')).toBeInTheDocument();
    expect(screen.getByText('28/30 moves')).toBeInTheDocument();
    expect(screen.getByText('95.0s / 90.0s')).toBeInTheDocument();
    expect(screen.getByLabelText('2 of 3 stars')).toBeInTheDocument();
    expect(screen.queryByText(/hint/i)).not.toBeInTheDocument();
  });

  it('attributes an anonymous result to "A player"', async () => {
    serve(levelResult({ player: null }));

    renderPage();

    expect(await screen.findByText('A player')).toBeInTheDocument();
  });

  it('states the hints when some were used', async () => {
    serve(levelResult({ hints: 2 }));

    renderPage();

    expect(await screen.findByText('2 hints')).toBeInTheDocument();
  });

  it('shows the leaderboard position', async () => {
    serve(levelResult());

    renderPage();

    expect(await screen.findByText('#3 of 6 on this level')).toBeInTheDocument();
  });

  it('previews the starting board', async () => {
    serve(levelResult());

    renderPage();

    const board = await screen.findByRole('img', { name: 'Starting board' });
    expect(board.querySelectorAll('[data-tube]')).toHaveLength(3);
    expect(board.querySelectorAll('[data-ball]')).toHaveLength(8);
  });

  it('plays a shared level by unlocking it with its code', async () => {
    serve(levelResult());
    context.unlockWithCode.mockResolvedValue({ levelId: 26 });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Play Level 26' }));

    expect(await screen.findByText('playing')).toBeInTheDocument();
    expect(context.unlockWithCode).toHaveBeenCalledWith('ABC123');
  });

  it("opens today's daily from a result of today", async () => {
    serve(dailyResult());

    renderPage();

    expect(await screen.findByText('solved the daily challenge of Sep 25')).toBeInTheDocument();
    expect(screen.getByText("#3 of 6 on that day's leaderboard")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Play today's daily" }));

    expect(await screen.findByText('daily screen')).toBeInTheDocument();
  });

  it('says an old daily has ended and offers today instead', async () => {
    serve(dailyResult({ isToday: false }));

    renderPage();

    expect(await screen.findByText('That daily challenge has ended.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Play today's daily" }));

    expect(await screen.findByText('daily screen')).toBeInTheDocument();
  });

  it('says so when the result does not exist, and offers the game', async () => {
    serve({}, 404);

    renderPage();

    expect(await screen.findByText('This result could not be found.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to the game' }));

    expect(await screen.findByText('home')).toBeInTheDocument();
  });

  it('offers no replay for a result without a move list', async () => {
    serve(levelResult({ moveList: null }));

    renderPage();

    await screen.findByText('dirnei');
    expect(screen.queryByRole('button', { name: 'Watch replay' })).not.toBeInTheDocument();
  });

  it('never asks the viewer to sign up', async () => {
    serve(levelResult({ player: null }));

    const { container } = renderPage();

    await screen.findByText('A player');
    expect(container.textContent).not.toMatch(/sign ?up|register|account|passkey/i);
  });
});

describe('shared result replay', () => {
  // Two pours solve it: the 1 from tube 1 onto tube 0, then the 2 left in tube 1 onto tube 2.
  const replayable = {
    board: { tubes: [[1], [2, 1], [2], []], capacity: 2 },
    moveList: [[1, 0], [1, 2]],
    moves: 2,
  };

  function motion(reduced: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  beforeEach(() => {
    motion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays the moves on the board, counting them', async () => {
    serve(levelResult(replayable));
    renderPage();

    const watch = await screen.findByRole('button', { name: 'Watch replay' });
    vi.useFakeTimers();
    fireEvent.click(watch);
    expect(screen.getByText('Move 0 of 2')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    expect(screen.getByText('Move 1 of 2')).toBeInTheDocument();

    const board = screen.getByRole('img', { name: 'Starting board' });
    const tubes = board.querySelectorAll('[data-tube]');
    expect(tubes[1]).toHaveAttribute('data-highlight', 'from');
    expect(tubes[0]).toHaveAttribute('data-highlight', 'to');

    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    expect(screen.getByText('Move 2 of 2')).toBeInTheDocument();
  });

  it('pauses and restarts', async () => {
    serve(levelResult(replayable));
    renderPage();

    const watch = await screen.findByRole('button', { name: 'Watch replay' });
    vi.useFakeTimers();
    fireEvent.click(watch);
    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS); });
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => { vi.advanceTimersByTime(REPLAY_STEP_MS * 3); });
    expect(screen.getByText('Move 1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(screen.getByText('Move 0 of 2')).toBeInTheDocument();
  });

  it('says how many moves were undone', async () => {
    serve(levelResult({ ...replayable, moves: 5 }));
    renderPage();

    expect(await screen.findByText('3 moves were undone')).toBeInTheDocument();
  });

  it('steps by hand with reduced motion', async () => {
    motion(true);
    serve(levelResult(replayable));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Watch replay' }));
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.getByText('Move 0 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next move' }));
    expect(screen.getByText('Move 1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    expect(screen.getByText('Move 0 of 2')).toBeInTheDocument();
  });
});
