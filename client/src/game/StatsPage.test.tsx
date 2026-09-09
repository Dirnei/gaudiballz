import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockGame = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./GameContext', () => ({
  useGameContext: () => mockGame.current,
}));
vi.mock('./identity', () => ({
  API: '',
  authHeaders: () => ({}),
}));

const { StatsPage } = await import('./StatsPage');

describe('StatsPage', () => {
  it('shows registration prompt for anonymous players', () => {
    mockGame.current = {
      identity: null,
      achievements: null,
      ensureAchievements: vi.fn(),
    };
    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Register an account/)).toBeTruthy();
  });

  it('renders stats for registered players', async () => {
    mockGame.current = {
      identity: { playerId: 'p1', isAnonymous: false, username: 'Test' },
      achievements: {
        achievements: [
          { id: 'a1', name: 'First Clear', description: '', category: 'milestone', earned: true, awardedAt: null, threshold: null, progress: null },
          { id: 'a2', name: 'Level 10', description: '', category: 'milestone', earned: false, awardedAt: null, threshold: 10, progress: 5 },
        ],
      },
      ensureAchievements: vi.fn(),
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalPoints: 5000, gamesPlayed: 50, gamesWon: 35, winRate: 70,
        highestLevel: 15, bestMoves: 8, bestMovesLevel: 3,
        currentStreak: 5, bestStreak: 10, globalRank: 12,
        totalLevels: 50, levelsCompleted: 15,
        comparisons: { points: 'Top 10%', level: '2 ahead of average', rank: 'Up 1 this week' },
      }),
    } as Response);

    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText((5000).toLocaleString())).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('#12')).toBeTruthy();
    expect(screen.getByText('1 / 2 unlocked')).toBeTruthy();
    expect(screen.getByText('First Clear')).toBeTruthy();
  });
});
