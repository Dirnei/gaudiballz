import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MissedStars } from './MissedStars';

const attempt = { moves: 15, par: 12, elapsedMs: 40_000, timeTargetMs: 30_000, hintsUsed: 0 };

describe('MissedStars', () => {
  it('lists every missed condition below 3 stars', () => {
    render(<MissedStars stars={1} attempt={attempt} />);

    expect(screen.getByText('3 moves over par')).toBeInTheDocument();
    expect(screen.getByText('10.0s over the time target')).toBeInTheDocument();
  });

  it('explains a used hint', () => {
    render(<MissedStars stars={1} attempt={{ ...attempt, moves: 10, elapsedMs: 20_000, hintsUsed: 1 }} />);

    expect(screen.getByText('A hint caps the rating at 1 star')).toBeInTheDocument();
  });

  it('renders nothing at 3 stars', () => {
    const { container } = render(<MissedStars stars={3} attempt={attempt} />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when there is no reason to give', () => {
    const { container } = render(
      <MissedStars stars={2} attempt={{ ...attempt, moves: 12, elapsedMs: 20_000 }} />,
    );

    expect(container.innerHTML).toBe('');
  });
});
