import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BallPicker } from './BallPicker';
import type { BallUnlock } from './profileBall';

const UNLOCKS: readonly BallUnlock[] = [
  { colour: 1, unlocksAtLevel: 1 },
  { colour: 2, unlocksAtLevel: 1 },
  { colour: 3, unlocksAtLevel: 1 },
  { colour: 4, unlocksAtLevel: 6 },
  { colour: 5, unlocksAtLevel: 15 },
  { colour: 6, unlocksAtLevel: 26 },
  { colour: 7, unlocksAtLevel: 39 },
  { colour: 8, unlocksAtLevel: 50 },
  { colour: 9, unlocksAtLevel: 71 },
  { colour: 10, unlocksAtLevel: 91 },
  { colour: 11, unlocksAtLevel: 111 },
  { colour: 12, unlocksAtLevel: 131 },
  { colour: 13, unlocksAtLevel: 151 },
];

function renderPicker(overrides: Partial<Parameters<typeof BallPicker>[0]> = {}) {
  const onChoose = vi.fn().mockResolvedValue(true);

  render(
    <BallPicker
      unlocks={UNLOCKS}
      highestCompleted={1}
      chosen={null}
      onChoose={onChoose}
      {...overrides}
    />,
  );

  return { onChoose };
}

describe('the whole set is visible', () => {
  it('shows every colour in the game, earned or not', () => {
    renderPicker({ highestCompleted: 1 });

    for (const unlock of UNLOCKS) {
      expect(screen.getByTestId(`ball-${unlock.colour}`)).toBeInTheDocument();
    }
  });

  it('dims the ones not yet earned and leaves the earned ones alone', () => {
    renderPicker({ highestCompleted: 1 });

    for (const colour of [1, 2, 3]) {
      expect(screen.getByTestId(`ball-${colour}`)).not.toHaveAttribute('data-locked');
    }

    for (const colour of [4, 8, 13]) {
      expect(screen.getByTestId(`ball-${colour}`)).toHaveAttribute('data-locked', 'true');
    }
  });

  it('says in words which level earns a locked ball', () => {
    renderPicker({ highestCompleted: 1 });

    expect(screen.getByTestId('ball-10')).toHaveAttribute(
      'aria-label',
      'Magenta — unlocks at level 91',
    );
    expect(screen.getByTestId('ball-2')).toHaveAttribute('aria-label', 'Green');
  });

  it('names an earned ball without a level', () => {
    renderPicker({ highestCompleted: 200 });

    expect(screen.getByTestId('ball-13')).toHaveAttribute('aria-label', 'Gray');
  });
});

describe('choosing', () => {
  it('saves an earned colour', async () => {
    const { onChoose } = renderPicker({ highestCompleted: 30 });

    fireEvent.click(screen.getByTestId('ball-6'));

    await waitFor(() => expect(onChoose).toHaveBeenCalledWith(6));
  });

  it('cannot take a ball that is not earned', async () => {
    const { onChoose } = renderPicker({ highestCompleted: 1 });

    const locked = screen.getByTestId('ball-9');
    expect(locked).toBeDisabled();

    fireEvent.click(locked);

    expect(onChoose).not.toHaveBeenCalled();
  });

  it('marks the chosen ball as the one in use', () => {
    renderPicker({ highestCompleted: 30, chosen: 5 });

    expect(screen.getByTestId('ball-5')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ball-4')).toHaveAttribute('aria-pressed', 'false');
  });

});

describe('an account that has finished nothing', () => {
  it('can take no ball at all', () => {
    renderPicker({ highestCompleted: 0 });

    for (const unlock of UNLOCKS) {
      expect(screen.getByTestId(`ball-${unlock.colour}`)).toBeDisabled();
    }
  });

  it('is told what earns the first ones', () => {
    renderPicker({ highestCompleted: 0 });

    expect(screen.getByText(/finish level 1 to earn your first balls/i)).toBeInTheDocument();
  });

  it('is not told that once it has some', () => {
    renderPicker({ highestCompleted: 1 });

    expect(screen.queryByText(/earn your first balls/i)).not.toBeInTheDocument();
  });
});

describe('when the save does not take', () => {
  it('says so and leaves the previous ball in place', async () => {
    const onChoose = vi.fn().mockResolvedValue(false);
    render(
      <BallPicker unlocks={UNLOCKS} highestCompleted={30} chosen={2} onChoose={onChoose} />,
    );

    fireEvent.click(screen.getByTestId('ball-6'));

    expect(await screen.findByText(/didn’t save/i)).toBeInTheDocument();
    expect(screen.getByTestId('ball-2')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('with no unlock table', () => {
  it('says the server is unreachable rather than showing an empty grid', () => {
    render(<BallPicker unlocks={[]} highestCompleted={30} chosen={null} onChoose={vi.fn()} />);

    expect(screen.getByText(/can’t reach the server/i)).toBeInTheDocument();
    expect(screen.queryByTestId('ball-1')).not.toBeInTheDocument();
  });
});
