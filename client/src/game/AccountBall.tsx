import { ballStyle } from '../skins';
import { ballForAccount } from './profileBall';
import type { Identity } from './identity';

interface AccountBallProps {
  readonly identity: Identity | null;
  /** Tailwind size classes, so the header and the panel can differ. */
  readonly className?: string;
}

/**
 * The mark of an account: one of the game's own balls, in the colour the player chose or,
 * failing that, the one derived from their username.
 *
 * A player with no account gets the dashed outline instead. That is the point of the thing —
 * a ball means "you are logged in", so an anonymous player must not have one, or the header
 * would stop saying anything.
 */
export function AccountBall({ identity, className = 'h-4 w-4' }: AccountBallProps) {
  const loggedIn = identity !== null && !identity.isAnonymous;

  if (!loggedIn) {
    return (
      <span
        data-testid="account-ball-empty"
        className={`${className} shrink-0 rounded-full border border-dashed border-white/25`}
      />
    );
  }

  const colour = ballForAccount(identity.ball, identity.username ?? identity.playerId);

  return (
    <span
      data-testid="account-ball"
      data-colour={colour}
      className={`${className} shrink-0`}
      style={ballStyle(colour)}
    />
  );
}
