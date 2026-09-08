import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AchievementToast } from './AchievementToast';

describe('AchievementToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the achievement name', () => {
    render(
      <AchievementToast
        achievements={[{ id: 'milestone-1', name: 'First Steps' }]}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('auto-dismisses and calls onDone after the timeout', () => {
    const onDone = vi.fn();
    render(
      <AchievementToast
        achievements={[{ id: 'milestone-1', name: 'First Steps' }]}
        onDone={onDone}
      />,
    );

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDone).toHaveBeenCalledOnce();
  });

  it('renders nothing for an empty array', () => {
    const onDone = vi.fn();
    const { container } = render(
      <AchievementToast achievements={[]} onDone={onDone} />,
    );

    expect(container.textContent).toBe('');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('renders nothing when achievements is undefined', () => {
    const onDone = vi.fn();
    const { container } = render(
      <AchievementToast
        achievements={undefined as unknown as []}
        onDone={onDone}
      />,
    );

    expect(container.textContent).toBe('');
  });

  it('shows "Achievement unlocked" label', () => {
    render(
      <AchievementToast
        achievements={[{ id: 'deep-diver', name: 'Deep Diver' }]}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('Achievement unlocked')).toBeInTheDocument();
  });
});
