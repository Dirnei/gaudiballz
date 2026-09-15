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
