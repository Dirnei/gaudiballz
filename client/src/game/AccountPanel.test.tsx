import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountPanel } from './AccountPanel';
import type { BallUnlock } from './profileBall';
import type { Identity } from './identity';

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

const ACCOUNT: Identity = {
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

function renderPanel(identity: Identity | null, highestCompleted = 30) {
  render(
    <AccountPanel
      open
      identity={identity}
      onClose={vi.fn()}
      onLoggedIn={vi.fn()}
      onRegistered={vi.fn()}
      onLogOut={vi.fn()}
      ballUnlocks={UNLOCKS}
      highestCompleted={highestCompleted}
      onChooseBall={vi.fn().mockResolvedValue(true)}

    />,
  );
}

describe('who is offered a ball', () => {
  it('offers the picker to an account', () => {
    renderPanel(ACCOUNT);

    expect(screen.getByRole('group', { name: 'Your ball' })).toBeInTheDocument();
  });

  /** A ball says which account you are on, and an anonymous player is not on one. */
  it('offers nothing to an anonymous player', () => {
    renderPanel(ANONYMOUS);

    expect(screen.queryByRole('group', { name: 'Your ball' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('ball-1')).not.toBeInTheDocument();
  });

  it('offers nothing when there is no identity at all', () => {
    renderPanel(null);

    expect(screen.queryByRole('group', { name: 'Your ball' })).not.toBeInTheDocument();
  });
});

describe('an account that has finished nothing', () => {
  it('is told what earns the first balls rather than shown an empty panel', () => {
    renderPanel(ACCOUNT, 0);

    expect(screen.getByRole('group', { name: 'Your ball' })).toBeInTheDocument();
    expect(screen.getByText(/finish level 1 to earn your first balls/i)).toBeInTheDocument();
  });
});

/**
 * The product stance, applied to balls: the game has nothing to sell, so it has no reason to
 * interrupt anyone. A colour becoming available is not news the player has to be handed.
 */
describe('nothing announces a newly earned ball', () => {
  it('carries no badge, dot, or "new" marker when colours have been earned', () => {
    renderPanel(ACCOUNT, 151);

    const panel = screen.getByRole('group', { name: 'Your ball' });

    expect(panel.textContent).not.toMatch(/new|unlocked|earned!|congratulations/i);
  });

  it('looks the same whether or not unseen colours have been earned', () => {
    const { unmount } = render(
      <AccountPanel
        open
        identity={ACCOUNT}
        onClose={vi.fn()}
        onLoggedIn={vi.fn()}
        onRegistered={vi.fn()}
        onLogOut={vi.fn()}
        ballUnlocks={UNLOCKS}
        highestCompleted={1}
        onChooseBall={vi.fn().mockResolvedValue(true)}
  
      />,
    );
    const beforeButtons = screen.getAllByRole('button').length;
    unmount();

    renderPanel(ACCOUNT, 26);

    // Six colours instead of three changes which balls are takeable and nothing else: no
    // extra control appears to point at the ones just earned.
    expect(screen.getAllByRole('button')).toHaveLength(beforeButtons);
  });
});
