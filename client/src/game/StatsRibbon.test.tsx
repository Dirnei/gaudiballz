import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./identity', () => ({
  API: '',
}));

const { StatsRibbon } = await import('./StatsRibbon');

describe('StatsRibbon', () => {
  it('renders stats when fetch succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ onlineCount: 42, solvedToday: 123, activeThisWeek: 567 }),
    } as Response);

    render(<StatsRibbon />);

    expect(await screen.findByText(/42 playing now/)).toBeTruthy();
    expect(screen.getByText(/123 puzzles solved today/)).toBeTruthy();
    expect(screen.getByText(/567 players this week/)).toBeTruthy();
  });

  it('renders nothing when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    const { container } = render(<StatsRibbon />);
    await vi.waitFor(() => {});
    expect(container.innerHTML).toBe('');
  });
});
