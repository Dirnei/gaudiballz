import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AchievementsScreen } from './AchievementsScreen';
import type { Achievement, AchievementState } from './achievements';
import type { Identity } from './identity';

const REGISTERED: Identity = {
  playerId: 'p1',
  token: 't',
  isAnonymous: false,
  username: 'dirnei',
  ball: null,
};

const ANONYMOUS: Identity = {
  playerId: 'p2',
  token: 't',
  isAnonymous: true,
  username: null,
  ball: null,
};

function achievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 'milestone-1',
    name: 'First Steps',
    description: 'Complete 1 level',
    category: 'milestone',
    earned: false,
    awardedAt: null,
    threshold: 1,
    progress: 0,
    ...overrides,
  };
}

function stateWith(...achievements: Achievement[]): AchievementState {
  return { achievements };
}

describe('AchievementsScreen', () => {
  it('shows a register prompt for anonymous players', () => {
    render(
      <AchievementsScreen identity={ANONYMOUS} state={null} onBack={vi.fn()} />,
    );

    expect(
      screen.getByText('Achievements are for registered players'),
    ).toBeInTheDocument();
  });

  it('shows a register prompt when identity is null', () => {
    render(
      <AchievementsScreen identity={null} state={null} onBack={vi.fn()} />,
    );

    expect(
      screen.getByText('Achievements are for registered players'),
    ).toBeInTheDocument();
  });

  it('shows loading when state is null for a registered player', () => {
    render(
      <AchievementsScreen identity={REGISTERED} state={null} onBack={vi.fn()} />,
    );

    expect(screen.getByText('Loading achievements...')).toBeInTheDocument();
  });

  it('renders earned achievements distinctly from locked ones', () => {
    const state = stateWith(
      achievement({ id: 'a1', name: 'Earned One', earned: true, awardedAt: '2026-09-01' }),
      achievement({ id: 'a2', name: 'Locked One', earned: false }),
    );

    render(
      <AchievementsScreen identity={REGISTERED} state={state} onBack={vi.fn()} />,
    );

    expect(screen.getByText('Earned One')).toBeInTheDocument();
    expect(screen.getByText('Locked One')).toBeInTheDocument();

    const earnedIcon = screen.getByText('Earned One').parentElement!.previousElementSibling!;
    const lockedIcon = screen.getByText('Locked One').parentElement!.previousElementSibling!;
    expect(earnedIcon.textContent).toContain('🏆');
    expect(lockedIcon.textContent).toContain('🔒');
  });

  it('shows progress for locked threshold achievements', () => {
    const state = stateWith(
      achievement({
        id: 'milestone-10',
        name: 'Double Digits',
        description: 'Complete 10 levels',
        earned: false,
        threshold: 10,
        progress: 7,
      }),
    );

    render(
      <AchievementsScreen identity={REGISTERED} state={state} onBack={vi.fn()} />,
    );

    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('groups achievements by category', () => {
    const state = stateWith(
      achievement({ id: 'm1', name: 'Milestone A', category: 'milestone' }),
      achievement({ id: 's1', name: 'Streak A', category: 'streak' }),
    );

    render(
      <AchievementsScreen identity={REGISTERED} state={state} onBack={vi.fn()} />,
    );

    expect(screen.getByText('Milestones')).toBeInTheDocument();
    expect(screen.getByText('Streaks')).toBeInTheDocument();
  });

  it('shows the overall progress count', () => {
    const state = stateWith(
      achievement({ id: 'a1', earned: true }),
      achievement({ id: 'a2', earned: false }),
      achievement({ id: 'a3', earned: true }),
    );

    render(
      <AchievementsScreen identity={REGISTERED} state={state} onBack={vi.fn()} />,
    );

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('has a back button', () => {
    render(
      <AchievementsScreen
        identity={REGISTERED}
        state={stateWith()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Back to menu' })).toBeInTheDocument();
  });
});
