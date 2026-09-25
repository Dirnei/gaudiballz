import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const daily = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('./useDailyGame', () => ({ useDailyGame: () => daily.current }));
vi.mock('./DailyLeaderboard', () => ({ DailyLeaderboard: () => null }));

const { DailyScreen } = await import('./DailyScreen');

/**
 * A solved daily. `alreadyDone` keeps the board itself out of the render: these tests are about
 * the solved overlay, and the board needs a full game to draw.
 */
function solved(overrides: Record<string, unknown> = {}) {
  return {
    load: 'ready',
    puzzle: { date: '2026-09-25', tubes: [], capacity: 4, colourCount: 6, parMoves: 20, timeTargetMs: 90_000 },
    alreadyDone: true,
    solved: true,
    completion: { stars: 3, points: 500, isNewBest: true, shareId: 'd4Ily9Zz' },
    moveCount: 18,
    hintsUsed: 0,
    elapsed: { elapsedMs: () => 42_300 },
    restart: vi.fn(),
    ...overrides,
  };
}

function renderDaily() {
  return render(
    <MemoryRouter>
      <DailyScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  daily.current = solved();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('daily solved overlay', () => {
  it('explains a missed star', () => {
    daily.current = solved({ completion: { stars: 1, points: 100, isNewBest: false }, moveCount: 22 });

    renderDaily();

    expect(screen.getByText('2 moves over par')).toBeInTheDocument();
  });

  it('says nothing about missed stars at 3 stars', () => {
    renderDaily();

    expect(screen.queryByText(/over par|over the time target/)).not.toBeInTheDocument();
  });
});

describe('sharing the daily result', () => {
  it('copies the result text and says so, without a share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText } });

    renderDaily();
    fireEvent.click(screen.getByRole('button', { name: 'Share result' }));

    await screen.findByRole('button', { name: 'Copied!' });
    expect(writeText).toHaveBeenCalledWith(
      `I played Gaudi Ballz / Daily Sep 25\n\n⭐️⭐️⭐️ 18/20 moves | ⏱️ 42.3s/90.0s\n\nCheck out on ${window.location.origin}/r/d4Ily9Zz`,
    );
    expect(share).not.toHaveBeenCalled();
  });
});
