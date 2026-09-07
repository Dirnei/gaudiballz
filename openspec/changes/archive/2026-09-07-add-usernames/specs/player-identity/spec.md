## MODIFIED Requirements

### Requirement: Passkey enrolment

A player SHALL be able to register an account at any time, and the progress already made
SHALL remain attached to it.

Registration SHALL require a username, and that username SHALL be unique. Uniqueness SHALL
be case-insensitive, so two accounts cannot differ only in capitalisation.

A username that is already taken SHALL be reported before the device is asked for a passkey,
so the player is not sent through the passkey ceremony only to be refused afterwards.

Registration SHALL use the browser's built-in passkey mechanism. The system SHALL NOT ask
for a password, and SHALL NOT require an email address.

A player SHALL be able to attach more than one passkey to their account, so that a second
device can be added without relying on synchronisation.

Where the browser or device cannot do passkeys, the system SHALL say so plainly and leave
the player anonymous rather than falling back to a password.

#### Scenario: A player enrols and keeps their progress

- **WHEN** a player who has completed levels registers with a username
- **THEN** the account carries that username
- **AND** their completed levels are unchanged

#### Scenario: A taken username is refused before the passkey step

- **WHEN** a player enters a username that already exists
- **THEN** they are told it is taken
- **AND** their device is not asked to create a passkey

#### Scenario: Capitalisation does not make a name free

- **WHEN** a username exists and a player enters the same name with different capitalisation
- **THEN** it is refused as taken

#### Scenario: No password is ever requested

- **WHEN** a player registers
- **THEN** no password is asked for at any point
- **AND** no email address is asked for

#### Scenario: An unsupported device is told plainly

- **WHEN** the browser cannot create a passkey
- **THEN** the player is told it is unavailable here
- **AND** they remain anonymous and able to keep playing

### Requirement: Signing in on another device

A player SHALL be able to log in with a passkey on a different device and reach the same
account.

Logging in SHALL NOT require the player to type their username, an email address, or a
recovery code: the browser offers the credential and the account is resolved from it. The
username names the account rather than being the thing that opens it.

After logging in, the system SHALL show which account the player is on.

#### Scenario: The same account on a second device

- **WHEN** a player logs in with their passkey on another device
- **THEN** they reach the account the passkey belongs to
- **AND** the progress on that account is available

#### Scenario: Logging in needs nothing typed

- **WHEN** a player logs in
- **THEN** they are not asked to type a username or an email address

#### Scenario: An unknown passkey is refused

- **WHEN** a credential that belongs to no account is presented
- **THEN** logging in is refused
- **AND** no new account is created from it

## ADDED Requirements

### Requirement: The account state is stated, not implied

The interface SHALL make clear whether the player is logged in, without them having to open
anything to find out.

When logged in, the username SHALL be shown. When not logged in, the interface SHALL say so
in those terms rather than leaving the absence of a name to be interpreted.

The words used SHALL be **log in**, **register** and **log out**. The interface SHALL NOT
require the player to understand passkeys, enrolment, or credentials to keep their progress.

#### Scenario: A logged-in player can see who they are

- **WHEN** a player is logged in
- **THEN** their username is visible without opening anything

#### Scenario: A logged-out player is told so

- **WHEN** a player has no account
- **THEN** the interface says they are not logged in

#### Scenario: The controls use ordinary words

- **WHEN** a player opens the account controls
- **THEN** the actions offered are log in, register, and log out
