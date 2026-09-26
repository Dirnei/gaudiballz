import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  describe('streak freezes', () => {
    const registered = {
      identity: { playerId: 'p1', isAnonymous: false, username: 'Test' },
      progress: { totalPoints: 5000, highestCompleted: 12, levelsCompleted: 12, levels: [] },
    };

    function stats(extra: Record<string, unknown>) {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ globalRank: 7, currentStreak: 15, streakFreezes: 0, streakSavedDays: 0, ...extra }),
      } as Response);
    }

    beforeEach(() => {
      localStorage.clear();
    });

    it('shows two held freezes on the streak tile', async () => {
      mockGame.current = registered;
      stats({ streakFreezes: 2 });
      render(<ProgressTiles />);
      expect(await screen.findByLabelText('2 streak freezes')).toBeTruthy();
      expect(screen.getByText('15')).toBeTruthy();
    });

    it('shows one held freeze in the singular', async () => {
      mockGame.current = registered;
      stats({ streakFreezes: 1 });
      render(<ProgressTiles />);
      expect(await screen.findByLabelText('1 streak freeze')).toBeTruthy();
    });

    it('shows no freeze indicator without freezes', async () => {
      mockGame.current = registered;
      stats({ streakFreezes: 0 });
      render(<ProgressTiles />);
      expect(await screen.findByText('15')).toBeTruthy();
      expect(screen.queryByLabelText(/streak freeze/)).toBeNull();
    });

    it('takes the streak from the server for anonymous players too', async () => {
      mockGame.current = { ...registered, identity: { playerId: 'p2', isAnonymous: true, username: null } };
      stats({ currentStreak: 9, streakFreezes: 1 });
      render(<ProgressTiles />);
      expect(await screen.findByText('9')).toBeTruthy();
      expect(screen.getByLabelText('1 streak freeze')).toBeTruthy();
      expect(screen.queryByText('Global Rank')).toBeNull();
    });

    it('tells the player a freeze saved their streak', async () => {
      mockGame.current = registered;
      stats({ streakFreezes: 1, streakSavedDays: 1, streakAnchorDay: '2026-09-24' });
      render(<ProgressTiles />);
      expect(await screen.findByText('Streak saved')).toBeTruthy();
      expect(screen.getByText(/1 freeze left/)).toBeTruthy();
    });

    it('keeps a dismissed notice dismissed for the same gap', async () => {
      mockGame.current = registered;
      stats({ streakFreezes: 1, streakSavedDays: 1, streakAnchorDay: '2026-09-24' });
      const first = render(<ProgressTiles />);
      fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
      expect(screen.queryByText('Streak saved')).toBeNull();
      first.unmount();

      stats({ streakFreezes: 1, streakSavedDays: 1, streakAnchorDay: '2026-09-24' });
      render(<ProgressTiles />);
      expect(await screen.findByText('15')).toBeTruthy();
      expect(screen.queryByText('Streak saved')).toBeNull();
    });

    it('shows the notice again for a new gap', async () => {
      localStorage.setItem('streakNoticeDismissed', '2026-09-10');
      mockGame.current = registered;
      stats({ streakFreezes: 0, streakSavedDays: 1, streakAnchorDay: '2026-09-24' });
      render(<ProgressTiles />);
      expect(await screen.findByText('Streak saved')).toBeTruthy();
    });

    it('shows no notice when nothing is covered', async () => {
      mockGame.current = registered;
      stats({ streakFreezes: 2, streakSavedDays: 0 });
      render(<ProgressTiles />);
      expect(await screen.findByText('15')).toBeTruthy();
      expect(screen.queryByText('Streak saved')).toBeNull();
    });
  });
});
