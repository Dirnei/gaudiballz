## MODIFIED Requirements

### Requirement: Signing out

Signing out SHALL be offered only to a player with a passkey attached. An anonymous player
SHALL NOT be offered it: anonymous is the signed-out state, so there is no account to leave.

Where it is offered, it SHALL be reachable in the same place as the other account controls.

Signing out SHALL forget the identity on this device only. It SHALL NOT delete the account,
so an account with a passkey can be signed back in to and finds its progress intact.

After signing out the player SHALL be returned to a fresh anonymous identity and SHALL be
able to keep playing immediately, with no interaction required.

#### Scenario: Leaving an account on a shared device

- **WHEN** a player with a passkey signs out
- **THEN** the device no longer holds their identity
- **AND** the game continues as a new anonymous player

#### Scenario: The account is still there afterwards

- **WHEN** a player signs out and then signs in again with the same passkey
- **THEN** their progress is as they left it

#### Scenario: Play continues without interaction

- **WHEN** a player signs out
- **THEN** they can immediately start a level
- **AND** they are not asked to sign in or sign up

#### Scenario: An anonymous player is not offered it

- **WHEN** a player with no passkey opens the account controls
- **THEN** no sign out is shown

## REMOVED Requirements

### Requirement: Signing out of an anonymous account is one-way

**Reason**: The situation it guarded no longer exists. Sign out is now offered only to
players with a passkey, and every such sign out is reversible, so there is nothing
irreversible left to warn about. The warning was compensating for a control that should not
have been shown in the first place.

**Migration**: None. The warning and the branch that produced it are removed with the
control. A player who wants to abandon an anonymous identity clears their browser data,
which is the same act under a more honest name.
