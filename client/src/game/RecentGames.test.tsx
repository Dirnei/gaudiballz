import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGame = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./GameContext', () => ({
  useGameContext: () => mockGame.current,
}));

const { RecentGames } = await import('./RecentGames');

describe('RecentGames', () => {
  it('renders recent game entries', () => {
    mockGame.current = {
      progress: {
        totalPoints: 1000,
        highestCompleted: 5,
        levelsCompleted: 3,
        levels: [
          { level: 3, moves: 15, hints: 0, stars: 3, points: 500 },
          { level: 5, moves: 20, hints: 1, stars: 1, points: 100 },
          { level: 1, moves: 10, hints: 0, stars: 2, points: 250 },
        ],
      },
    };
    render(<RecentGames />);
    expect(screen.getByText('Level 5')).toBeTruthy();
    expect(screen.getByText('Level 3')).toBeTruthy();
  });

  it('renders nothing when no progress', () => {
    mockGame.current = { progress: null };
    const { container } = render(<RecentGames />);
    expect(container.innerHTML).toBe('');
  });
});
