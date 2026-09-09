import { fireEvent, render, screen } from '@testing-library/react';
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

const { LeaderboardPage } = await import('./LeaderboardPage');

const entries = [
  { rank: 1, playerId: 'p1', username: 'TubeKing', totalPoints: 10000, gamesPlayed: 100, gamesWon: 80 },
  { rank: 2, playerId: 'p2', username: 'SortQueen', totalPoints: 8000, gamesPlayed: 90, gamesWon: 70 },
  { rank: 3, playerId: 'p3', username: 'BallMaster', totalPoints: 6000, gamesPlayed: 80, gamesWon: 50 },
  { rank: 4, playerId: 'p4', username: 'NewPlayer', totalPoints: 4000, gamesPlayed: 60, gamesWon: 30 },
];

function setup(playerId = 'p4') {
  mockGame.current = { identity: { playerId, isAnonymous: false, username: 'NewPlayer' } };
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ entries, viewer: entries.find((e) => e.playerId === playerId) ?? null, total: 4 }),
  } as Response);

  render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  );
}

describe('LeaderboardPage', () => {
  it('renders podium and table', async () => {
    setup();
    expect(await screen.findByText('TubeKing')).toBeTruthy();
    expect(screen.getByText('SortQueen')).toBeTruthy();
    expect(screen.getByText('BallMaster')).toBeTruthy();
    expect(screen.getByText('NewPlayer (you)')).toBeTruthy();
  });

  it('switches period tabs', async () => {
    setup();
    await screen.findByText('TubeKing');
    fireEvent.click(screen.getByText('This Week'));
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('period=week'), expect.anything());
  });
});
