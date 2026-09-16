import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./identity', () => ({
  API: '',
}));

const { StatsRibbon } = await import('./StatsRibbon');

describe('StatsRibbon', () => {
  it('renders stats when given data', () => {
    render(<StatsRibbon stats={{
      onlineCount: 42,
      solvedToday: 123,
      activeThisWeek: 567,
      dailyHistory: [],
      gamesThisWeek: 0,
      gamesThisMonth: 0,
      gamesAllTime: 0,
    }} />);

    expect(screen.getByText(/42 playing now/)).toBeTruthy();
    expect(screen.getByText(/123 puzzles solved today/)).toBeTruthy();
    expect(screen.getByText(/567 players this week/)).toBeTruthy();
  });

  it('renders nothing when stats is null', () => {
    const { container } = render(<StatsRibbon stats={null} />);
    expect(container.innerHTML).toBe('');
  });
});
