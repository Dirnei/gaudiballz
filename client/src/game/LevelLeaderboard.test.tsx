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
    expect(entry.closest('tr')).toBeTruthy();
    expect(screen.getByText('(you)')).toBeTruthy();
  });

  it('shows viewer rank when outside the list', async () => {
    mockFetch({ entries, viewer: { rank: 42, stars: 1, moves: 20, timeMs: 30000 } });

    render(<LevelLeaderboard level={5} myId="viewer1" />);

    expect(await screen.findByText(/Your rank: #42/)).toBeTruthy();
  });

  describe('compact', () => {
    it('shows rank, name, star count, moves and time', async () => {
      mockFetch({ entries, viewer: null });

      const { container } = render(<LevelLeaderboard level={5} compact />);

      const row = (await screen.findByText('Alice')).closest('tr')!;
      expect(row.textContent).toContain('1');
      expect(row.textContent).toContain('Alice');
      expect(row.textContent).toContain('8m');
      expect(row.textContent).toContain('12.0s');

      // One star glyph carrying a count, rather than one glyph per star.
      expect(container.textContent!.match(/★/g)!.length).toBe(entries.length);
      expect(row.textContent).toContain('★3');
    });

    it('renders no profile ball and no rank badge', async () => {
      mockFetch({ entries, viewer: null });

      const { container } = render(<LevelLeaderboard level={5} compact />);
      await screen.findByText('Alice');

      // Alice sits at 80,000 XP, exactly Silver 1, so a badge would read "Silver".
      expect(screen.queryByText(/Silver/)).toBeNull();
      // The ball's rank ring is the only thing drawing a box-shadow.
      expect(container.querySelector('[style*="box-shadow"]')).toBeNull();
    });

    it('keeps ball, badge and three glyphs per entry at full width', async () => {
      mockFetch({ entries, viewer: null });

      const { container } = render(<LevelLeaderboard level={5} />);
      await screen.findByText('Alice');

      expect(screen.getByText(/Silver/)).toBeTruthy();
      expect(container.querySelector('[style*="box-shadow"]')).toBeTruthy();
      expect(container.textContent!.match(/★/g)!.length).toBe(entries.length * 3);
    });

    it('lays the rows out as table columns so they cannot wobble', async () => {
      // Alice is "8m / 12.0s", Bob "12m / 18.0s" — different digit counts in both columns,
      // which is what made the rows wobble while each was an independently sized flex row.
      // A shared column cannot: equal cell counts and a stable cell index are what make the
      // values line up, and jsdom can check both without laying anything out.
      mockFetch({ entries, viewer: null });

      const { container } = render(<LevelLeaderboard level={5} compact />);
      await screen.findByText('Alice');

      const rows = Array.from(container.querySelectorAll('tbody tr'));
      expect(rows).toHaveLength(entries.length);

      const cellCounts = rows.map((r) => r.querySelectorAll('td').length);
      expect(new Set(cellCounts).size).toBe(1);

      const indexOf = (row: Element, re: RegExp) =>
        Array.from(row.querySelectorAll('td'))
          .findIndex((td) => re.test((td.textContent ?? '').trim()));

      const moveIdx = rows.map((r) => indexOf(r, /^\d+m$/));
      const timeIdx = rows.map((r) => indexOf(r, /^\d+\.\d+s$/));

      expect(moveIdx.every((i) => i >= 0)).toBe(true);
      expect(timeIdx.every((i) => i >= 0)).toBe(true);
      expect(new Set(moveIdx).size).toBe(1);
      expect(new Set(timeIdx).size).toBe(1);
    });

    it('still explains the ordering when a lower row has better moves', async () => {
      // Alice ranks above Bob on stars despite Bob's better moves and time, so the star
      // count has to stay visible or the order contradicts every number shown.
      mockFetch({ entries, viewer: null });

      render(<LevelLeaderboard level={5} compact />);

      const alice = (await screen.findByText('Alice')).closest('tr')!;
      const bob = screen.getByText('Bob').closest('tr')!;

      expect(alice.textContent).toContain('★3');
      expect(bob.textContent).toContain('★2');
      expect(Number(bob.textContent!.match(/(\d+)m/)![1]))
        .toBeGreaterThan(Number(alice.textContent!.match(/(\d+)m/)![1]));
    });
  });
});
