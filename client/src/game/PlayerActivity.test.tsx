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

const { PlayerActivity } = await import('./PlayerActivity');

const stats = {
  gamesThisWeek: 12,
  gamesThisMonth: 45,
  gamesAllTime: 300,
  bestStreak: 7,
  winRate: 82,
};

describe('PlayerActivity', () => {
  it('renders stats for registered users', async () => {
    mockGame.current = { identity: { playerId: 'p1', isAnonymous: false } };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => stats,
    } as Response);

    render(<PlayerActivity />);

    expect(await screen.findByText('12')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy();
    expect(screen.getByText('300')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getByText('82%')).toBeTruthy();
  });

  it('renders nothing for anonymous users', () => {
    mockGame.current = { identity: { playerId: 'p1', isAnonymous: true } };
    const { container } = render(<PlayerActivity />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when not logged in', () => {
    mockGame.current = { identity: null };
    const { container } = render(<PlayerActivity />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when fetch fails', async () => {
    mockGame.current = { identity: { playerId: 'p1', isAnonymous: false } };
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    const { container } = render(<PlayerActivity />);
    await vi.waitFor(() => {});
    expect(container.innerHTML).toBe('');
  });
});
