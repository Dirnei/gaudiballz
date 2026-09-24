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

const { DailyLeaderboard } = await import('./DailyLeaderboard');

const entries = [
  { rank: 1, playerId: 'p1', username: 'Alice', ball: null, stars: 3, moves: 8, elapsedTimeMs: 12000 },
  { rank: 2, playerId: 'p2', username: 'Bob', ball: null, stars: 2, moves: 12, elapsedTimeMs: 18000 },
];

function setup(identity: object | null, viewer: object | null) {
  mockGame.current = { identity };
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ entries, viewer }),
  } as Response);

  render(<DailyLeaderboard />);
}

describe('DailyLeaderboard', () => {
  it('marks only the signed-in player as "you"', async () => {
    setup(
      { playerId: 'p2', isAnonymous: false, username: 'Bob' },
      { playerId: 'p2', rank: 2, ball: null, stars: 2, moves: 12, elapsedTimeMs: 18000 },
    );

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.getAllByText('(you)')).toHaveLength(1);
  });

  it('marks nobody when no one is signed in', async () => {
    setup(null, null);

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.queryByText('(you)')).toBeNull();
  });

  it('marks nobody when the response carries no ids at all', async () => {
    // A server that omits playerId must not make every row match every other row.
    mockGame.current = { identity: { playerId: 'p2', isAnonymous: false, username: 'Bob' } };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: entries.map(({ playerId: _ignored, ...rest }) => rest),
        viewer: { rank: 2, ball: null, stars: 2, moves: 12, elapsedTimeMs: 18000 },
      }),
    } as Response);

    render(<DailyLeaderboard />);

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.queryByText('(you)')).toBeNull();
  });

  it('shows the viewer\'s own rank when they placed outside the listed entries', async () => {
    setup(
      { playerId: 'p7', isAnonymous: false, username: 'Zoe' },
      { playerId: 'p7', rank: 14, ball: null, stars: 1, moves: 30, elapsedTimeMs: 60000 },
    );

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.getByText(/#14/)).toBeTruthy();
    // The out-of-list card is the only place they appear; no row is marked.
    expect(screen.queryByText('(you)')).toBeNull();
  });
});
