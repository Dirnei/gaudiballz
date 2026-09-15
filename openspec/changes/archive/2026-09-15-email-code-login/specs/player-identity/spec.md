## ADDED Requirements

### Requirement: Email can be linked to an account

A registered player SHALL be able to add an email address to their account.

Adding an email SHALL require verification: the system SHALL send a one-time code to the
address and the player SHALL enter that code to confirm ownership.

An email address SHALL be unique across accounts. Two accounts SHALL NOT share the same
email, and uniqueness SHALL be case-insensitive.

A player SHALL be able to remove their email from the account, leaving passkey as the
sole authentication method.

The system SHALL NOT require an email address at any point. Email is always optional.

#### Scenario: A player links an email

- **WHEN** a registered player provides an email address
- **THEN** a one-time code is sent to that address
- **AND** the email is not linked until the code is entered correctly

#### Scenario: A verified email is stored

- **WHEN** the player enters the correct code
- **THEN** the email is linked to their account
- **AND** it can be used for sign-in from that point

#### Scenario: A duplicate email is refused

- **WHEN** a player tries to link an email that another account already uses
- **THEN** the request is refused
- **AND** the player is told the email is already in use

#### Scenario: Email uniqueness is case-insensitive

- **WHEN** an email is linked and another player tries the same address with different
  capitalisation
- **THEN** it is refused as already in use

#### Scenario: A player removes their email

- **WHEN** a registered player removes their linked email
- **THEN** the email is no longer associated with the account
- **AND** email sign-in is no longer available for that account

### Requirement: Registration with email

When passkeys are unavailable, a player SHALL be able to register with a username and
an email address instead.

Registration via email SHALL follow the same username rules as passkey registration:
unique, case-insensitive, 3–20 characters, letters, digits, hyphens and underscores.

The email SHALL be verified before the account is created, using the same one-time code
mechanism as email linking.

After registering via email, a player SHALL be able to add a passkey later.

#### Scenario: A player registers via email when passkeys are blocked

- **WHEN** a player on a device that cannot create passkeys enters a username and email
- **THEN** a one-time code is sent to the email
- **AND** entering the correct code completes registration
- **AND** the player's prior anonymous progress is preserved

#### Scenario: A taken username is refused before the code step

- **WHEN** a player enters a username that already exists
- **THEN** they are told it is taken before the code is sent

#### Scenario: An email-registered player can add a passkey later

- **WHEN** a player who registered via email is on a device that supports passkeys
- **THEN** they can add a passkey to their account

### Requirement: Signing in with email code

A player with a linked email SHALL be able to sign in by requesting a code sent to that
email, as an alternative to the passkey flow.

The email sign-in option SHALL be available alongside the passkey option, presented as a
secondary choice. Passkey SHALL remain the default.

After signing in via email code, the player SHALL reach the same account with the same
progress as if they had used a passkey.

#### Scenario: A player signs in with an email code

- **WHEN** a player with a linked email chooses to sign in via email
- **THEN** they enter their email address
- **AND** a one-time code is sent to it
- **AND** entering the correct code signs them in

#### Scenario: An unknown email is refused without revealing whether it exists

- **WHEN** someone enters an email that is not linked to any account
- **THEN** sign-in is refused
- **AND** the system does not disclose whether the email is registered

#### Scenario: The same account is reached via email as via passkey

- **WHEN** a player signs in with their email code
- **THEN** they reach the same account and progress as if they had used a passkey

### Requirement: One-time codes are short-lived and single-use

A one-time code SHALL expire after a limited time. After expiry the code SHALL NOT be
accepted and the player SHALL request a new one.

A code SHALL be usable exactly once. After it has been used, presenting it again SHALL
be refused.

The system SHALL limit how often a code can be sent to the same email address within a
short period to prevent abuse.

#### Scenario: An expired code is refused

- **WHEN** a player enters a code after it has expired
- **THEN** it is refused
- **AND** the player is told to request a new code

#### Scenario: A used code cannot be reused

- **WHEN** a player enters a code that has already been used successfully
- **THEN** it is refused

#### Scenario: Rapid re-requests are throttled

- **WHEN** a player requests a new code before the cooldown has passed
- **THEN** the request is refused
- **AND** the player is told to wait

### Requirement: Email sign-in is never solicited

The system SHALL NOT prompt, nudge, or interrupt a player to add an email or to use
email sign-in. The option SHALL sit alongside the passkey controls and wait to be found,
following the same principle as passkey enrolment.

#### Scenario: Adding an email is available but not pushed

- **WHEN** a registered player opens the account controls
- **THEN** the option to add an email is reachable
- **AND** no prompt or banner suggests it unprompted

### Requirement: SMTP must be configured for email to work

The system SHALL require SMTP configuration before any email-related feature is available.

When SMTP is not configured, the email sign-in and email-linking options SHALL NOT be
shown to players. The system SHALL degrade gracefully to passkey-only operation.

#### Scenario: No SMTP means no email options

- **WHEN** the server starts without SMTP configuration
- **THEN** no email-related options are shown to any player
- **AND** the game operates exactly as it did before this change

#### Scenario: SMTP configuration enables email features

- **WHEN** the server is configured with valid SMTP settings
- **THEN** email sign-in and email linking become available

## MODIFIED Requirements

### Requirement: Passkey enrolment

A player SHALL be able to register an account at any time, and the progress already made
SHALL remain attached to it.

Registration SHALL require a username, and that username SHALL be unique. Uniqueness SHALL
be case-insensitive, so two accounts cannot differ only in capitalisation.

A username that is already taken SHALL be reported before the device is asked for a passkey,
so the player is not sent through the passkey ceremony only to be refused afterwards.

Registration SHALL use the browser's built-in passkey mechanism. The system SHALL NOT ask
for a password. An email address MAY be offered as an alternative registration method but
SHALL NOT be required.

A player SHALL be able to attach more than one passkey to their account, so that a second
device can be added without relying on synchronisation.

Where the browser or device cannot do passkeys, the system SHALL offer email-based
registration as an alternative when SMTP is configured, or say plainly that account
creation is unavailable here when it is not.

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

#### Scenario: An unsupported device is offered email when SMTP is configured

- **WHEN** the browser cannot create a passkey and SMTP is configured
- **THEN** the player is offered email-based registration instead

#### Scenario: An unsupported device without SMTP is told plainly

- **WHEN** the browser cannot create a passkey and SMTP is not configured
- **THEN** the player is told account creation is unavailable here
- **AND** they remain anonymous and able to keep playing

### Requirement: The limits of a passkey are stated

Before a player enrols, the system SHALL make clear that access depends on the passkey,
and that losing every device holding it means losing the account — unless an email is
also linked.

When no email is linked, the system SHALL NOT imply a recovery route it does not have.
When an email is linked, the system SHALL state that the email provides a way back in.

#### Scenario: The trade-off is stated up front

- **WHEN** a player is about to create a passkey
- **THEN** they are told that losing it means losing access to the account unless they
  also add an email

#### Scenario: A player with email is told recovery is available

- **WHEN** a registered player has a linked email
- **THEN** the account controls indicate that the email can be used to recover access
