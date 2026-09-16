import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./identity', () => ({
  API: '',
  authHeaders: () => ({}),
}));

const { LevelLeaderboard } = await import('./LevelLeaderboard');

const entries = [
  { rank: 1, playerId: 'p1', username: 'Alice', ball: null, stars: 3, moves: 8, timeMs: 12000, allTimeXp: 80000 },
  { rank: 2, playerId: 'p2', username: 'Bob', ball: null, stars: 2, moves: 12, timeMs: 18000, allTimeXp: 5000 },
];

function mockFetch(data: object) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response);
}

describe('LevelLeaderboard', () => {
  it('renders entries with usernames', async () => {
    mockFetch({ entries, viewer: null });

    render(<LevelLeaderboard level={5} />);

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('shows empty state when no entries', async () => {
    mockFetch({ entries: [], viewer: null });

    render(<LevelLeaderboard level={5} />);

    expect(await screen.findByText('No results for this period yet.')).toBeTruthy();
  });

  it('switches period on tab click', async () => {
    mockFetch({ entries, viewer: null });

    render(<LevelLeaderboard level={5} />);
    await screen.findByText('Alice');

    fireEvent.click(screen.getByText('This Week'));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('period=week'),
      expect.anything(),
    );
  });

  it('highlights the viewer entry', async () => {
    mockFetch({ entries, viewer: null });

    render(<LevelLeaderboard level={5} myId="p1" />);

    const entry = await screen.findByText('Alice');
    expect(entry.closest('div')).toBeTruthy();
    expect(screen.getByText('(you)')).toBeTruthy();
  });

  it('shows viewer rank when outside the list', async () => {
    mockFetch({ entries, viewer: { rank: 42, stars: 1, moves: 20, timeMs: 30000 } });

    render(<LevelLeaderboard level={5} myId="viewer1" />);

    expect(await screen.findByText(/Your rank: #42/)).toBeTruthy();
  });
});
