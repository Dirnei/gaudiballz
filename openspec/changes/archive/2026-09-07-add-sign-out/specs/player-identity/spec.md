## ADDED Requirements

### Requirement: Signing out

A player SHALL be able to sign out, and this SHALL be reachable in the same place as the
other account controls.

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

### Requirement: Signing out of an anonymous account is one-way

When no passkey is attached, signing out leaves the account unreachable. Before it happens,
the system SHALL make clear that the progress on it cannot be recovered.

The warning SHALL be shown only in that case. Where a passkey is attached, signing out SHALL
NOT be presented as destructive, because it is not.

The system SHALL NOT prevent the player from signing out.

#### Scenario: Anonymous sign out is called what it is

- **WHEN** a player with no passkey is about to sign out
- **THEN** they are told the progress on this account cannot be recovered afterwards

#### Scenario: Enrolled sign out is not dressed up as loss

- **WHEN** a player with a passkey is about to sign out
- **THEN** no warning about losing progress is shown

#### Scenario: The player decides

- **WHEN** a player with no passkey chooses to sign out anyway
- **THEN** they are signed out

### Requirement: Work in hand is not stranded

Completions still waiting to be sent SHALL be sent before the identity is forgotten.

Any that cannot be sent SHALL be discarded rather than carried over, so that work belonging
to one account is never recorded against another.

#### Scenario: Queued completions go to the account they belong to

- **WHEN** a player signs out with completions still queued
- **THEN** those completions are sent before the identity is forgotten

#### Scenario: Nothing is carried across

- **WHEN** completions cannot be sent before signing out
- **THEN** they are discarded
- **AND** they are not recorded against the next account used on this device
