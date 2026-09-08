import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountBall } from './AccountBall';
import { colourForName } from '../skins';
import type { Identity } from './identity';

function account(overrides: Partial<Identity> = {}): Identity {
  return {
    playerId: 'p1',
    token: 't',
    isAnonymous: false,
    username: 'dirnei',
    ball: null,
    ...overrides,
  };
}

describe('the ball shown for an account', () => {
  it('uses the chosen colour when there is one', () => {
    render(<AccountBall identity={account({ ball: 11 })} />);

    expect(screen.getByTestId('account-ball')).toHaveAttribute('data-colour', '11');
  });

  it('falls back to the name-derived colour when nothing was chosen', () => {
    render(<AccountBall identity={account({ ball: null })} />);

    expect(screen.getByTestId('account-ball')).toHaveAttribute(
      'data-colour',
      String(colourForName('dirnei')),
    );
  });

  it('is the same colour every time the same account is shown', () => {
    const { unmount } = render(<AccountBall identity={account()} />);
    const first = screen.getByTestId('account-ball').getAttribute('data-colour');
    unmount();

    render(<AccountBall identity={account()} />);

    expect(screen.getByTestId('account-ball')).toHaveAttribute('data-colour', first!);
  });

  it('shows an empty outline for an anonymous player', () => {
    render(<AccountBall identity={account({ isAnonymous: true, username: null })} />);

    expect(screen.queryByTestId('account-ball')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-ball-empty')).toBeInTheDocument();
  });

  it('shows an empty outline when there is no identity at all', () => {
    render(<AccountBall identity={null} />);

    expect(screen.getByTestId('account-ball-empty')).toBeInTheDocument();
  });
});
