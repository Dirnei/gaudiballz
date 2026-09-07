# player-identity Specification

## Purpose
Establishes who a player is, from a silent anonymous first launch through to a passkey they
can use to reach the same account from any device. Exists so that progress belongs to a
person rather than to a browser.

## Requirements

### Requirement: Play begins without an account

A player SHALL be able to open the game and play immediately, with no account, no form, and
no interaction of any kind related to identity.

A durable player identity SHALL be created on first launch and used for everything that
follows, so that attaching a passkey later adds to an existing record rather than starting
a new one.

The identity SHALL be retained across visits on the same browser.

#### Scenario: A first-time player just plays

- **WHEN** someone opens the game for the first time
- **THEN** they can start level 1 immediately
- **AND** they are not asked to sign in, sign up, or provide anything

#### Scenario: The same browser returns to the same identity

- **WHEN** a player closes the game and opens it again later in the same browser
- **THEN** they are the same player as before

### Requirement: Passkey enrolment

A player SHALL be able to attach a passkey to their existing identity at any time, and the
progress already made SHALL remain attached to it.

Enrolment SHALL use the browser's built-in passkey mechanism. The system SHALL NOT ask for
a password, and SHALL NOT require an email address.

A player SHALL be able to attach more than one passkey, so that a second device can be
enrolled without relying on synchronisation.

Where the browser or device cannot do passkeys, the system SHALL say so plainly and leave
the player anonymous rather than falling back to a password.

#### Scenario: A player enrols and keeps their progress

- **WHEN** a player who has completed levels attaches a passkey
- **THEN** the passkey belongs to their existing identity
- **AND** their completed levels are unchanged

#### Scenario: No password is ever requested

- **WHEN** a player goes through enrolment
- **THEN** no password is asked for at any point

#### Scenario: An unsupported device is told plainly

- **WHEN** the browser cannot create a passkey
- **THEN** the player is told it is unavailable here
- **AND** they remain anonymous and able to keep playing

### Requirement: Enrolment is never solicited

The system SHALL NOT prompt, nudge, or interrupt a player to create an account.

There SHALL be no prompt on level completion, no modal, no banner, no badge, and no periodic
reminder. The option to create or use a passkey SHALL be reachable from the game at any
time, and SHALL only appear when the player goes looking for it.

#### Scenario: Completing a level does not trigger a pitch

- **WHEN** a player completes a level, including their first
- **THEN** nothing about accounts is shown

#### Scenario: The option is available when wanted

- **WHEN** a player looks for it
- **THEN** creating or using a passkey is reachable from the game

### Requirement: Signing in on another device

A player SHALL be able to sign in with an enrolled passkey on a different device and reach
the same account.

Signing in SHALL NOT require a username, an email address, or a recovery code.

#### Scenario: The same account on a second device

- **WHEN** a player signs in with their passkey on another device
- **THEN** they reach the account the passkey belongs to
- **AND** the progress on that account is available

#### Scenario: An unknown passkey is refused

- **WHEN** a credential that belongs to no account is presented
- **THEN** sign-in is refused
- **AND** no new account is created from it

### Requirement: The limits of a passkey are stated

Before a player enrols, the system SHALL make clear that access depends on the passkey, and
that losing every device holding it means losing the account.

The system SHALL NOT imply a recovery route it does not have.

#### Scenario: The trade-off is stated up front

- **WHEN** a player is about to create a passkey
- **THEN** they are told that losing it means losing access to the account
