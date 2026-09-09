import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGame = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./GameContext', () => ({
  useGameContext: () => mockGame.current,
}));
vi.mock('./identity', () => ({
  API: '',
  authHeaders: () => ({}),
}));

const { ProgressTiles } = await import('./ProgressTiles');

describe('ProgressTiles', () => {
  it('renders tiles when player has progress', async () => {
    mockGame.current = {
      identity: { playerId: 'p1', isAnonymous: false, username: 'Test' },
      progress: { totalPoints: 5000, highestCompleted: 12, levelsCompleted: 12, levels: [] },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ globalRank: 7, currentStreak: 3 }),
    } as Response);

    render(<ProgressTiles />);
    expect(screen.getByText((5000).toLocaleString())).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(await screen.findByText('Global Rank')).toBeTruthy();
  });

  it('hides rank tile for anonymous players', () => {
    mockGame.current = {
      identity: null,
      progress: { totalPoints: 100, highestCompleted: 1, levelsCompleted: 1, levels: [] },
    };
    render(<ProgressTiles />);
    expect(screen.queryByText('Global Rank')).toBeNull();
  });

  it('renders nothing when no progress', () => {
    mockGame.current = { identity: null, progress: null };
    const { container } = render(<ProgressTiles />);
    expect(container.innerHTML).toBe('');
  });
});
