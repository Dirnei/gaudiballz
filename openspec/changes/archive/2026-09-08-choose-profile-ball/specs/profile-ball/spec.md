## Purpose
Gives an account a face made of the game's own pieces, and lets the player choose it from the
colours they have actually played through. Exists so that the mark of who you are is earned
by playing rather than assigned by the system, without anything being sold or nagged for.

## ADDED Requirements

### Requirement: An account is shown as a ball

Wherever the game shows which account the player is on, it SHALL show a ball in one of the
game's own colours alongside the username.

Until the player chooses one, the colour SHALL be derived from the username, and SHALL be
the same every time that username is shown. The derived colour SHALL be one of the vivid
colours; a neutral SHALL NOT be derived, because a grey or white ball reads as the absence
of an account rather than as somebody's.

A player with no account SHALL NOT be shown a ball. The absence of an account is shown as an
empty outline, so a ball always means "you are logged in".

#### Scenario: A logged-in player has a ball

- **WHEN** a player is logged in and has chosen nothing
- **THEN** a coloured ball is shown with their username
- **AND** it is the same colour every time that account is shown

#### Scenario: An anonymous player has no ball

- **WHEN** a player has no account
- **THEN** no coloured ball is shown for them

### Requirement: Choosing a ball

A player with an account SHALL be able to choose which of the game's colours represents
them, from the same place the other account controls are reached.

The choice SHALL take effect immediately, everywhere the account is shown.

A player SHALL be able to change the choice as often as they like, and SHALL be able to
return to the colour derived from their username.

Choosing SHALL be optional: an account that has never chosen SHALL look exactly as it did
before choosing was possible.

A player with no account SHALL NOT be offered the choice, in keeping with there being no
account for a ball to belong to.

#### Scenario: A player picks a ball

- **WHEN** a logged-in player chooses an available colour
- **THEN** the ball shown for their account is that colour
- **AND** it is that colour everywhere the account appears

#### Scenario: The choice can be changed

- **WHEN** a player who has chosen a colour chooses a different one
- **THEN** the later choice is the one shown

#### Scenario: An account that never chose is untouched

- **WHEN** a player has never chosen a colour
- **THEN** the ball shown is the one derived from their username

#### Scenario: An anonymous player is not offered it

- **WHEN** a player with no account opens the account controls
- **THEN** no ball picker is shown

### Requirement: A ball is earned by finishing a level that uses it

A colour SHALL become available to choose once the player has completed a level that
contains it, and SHALL NOT be available before that.

Availability SHALL follow from the player's recorded completions, so it is a property of the
account rather than of the device: a colour earned on a phone SHALL be available on a PC.

Reaching a level without completing it SHALL NOT make its colours available, including a
level opened by a level code. Opening a level is not finishing it.

Availability SHALL NOT be lost. A colour that has become available SHALL stay available.

#### Scenario: Finishing a level earns its colours

- **WHEN** a player completes a level
- **THEN** every colour that level contains is available to choose

#### Scenario: Reaching a level earns nothing

- **WHEN** a player opens a level introducing a new colour but does not complete it
- **THEN** that colour is not available to choose

#### Scenario: A level code earns nothing

- **WHEN** a player unlocks a distant level with a code and does not complete it
- **THEN** that level's colours are not available to choose

#### Scenario: Earned on one device, available on another

- **WHEN** a player who earned a colour signs in on a different device
- **THEN** that colour is available to choose there

#### Scenario: A player who has completed nothing

- **WHEN** a player registers and has completed no level
- **THEN** no colour is available to choose
- **AND** what earns the first ones is stated

### Requirement: Colours not yet earned are shown, not hidden

Every colour in the game SHALL appear in the picker, whether or not it has been earned.

A colour that has not been earned SHALL be visibly distinguishable from an earned one — dimmed
rather than absent — so that the size of the full set is apparent from the start.

Each unearned colour SHALL state the earliest level that contains it, so the player can see
what it costs. The statement SHALL be text, not colour alone.

Selecting an unearned colour SHALL have no effect on the account, and SHALL NOT be reported
as an error the player has made.

#### Scenario: The whole set is visible from the start

- **WHEN** a player who has earned few colours opens the picker
- **THEN** every colour in the game is shown
- **AND** the ones not yet earned are shown dimmed

#### Scenario: An unearned ball says what earns it

- **WHEN** a player looks at a colour they have not earned
- **THEN** they are told the earliest level that contains it

#### Scenario: An unearned ball cannot be taken

- **WHEN** a player selects a colour they have not earned
- **THEN** the ball shown for their account is unchanged

### Requirement: The gate holds without the interface

A request to set an account's ball to a colour the account has not earned SHALL be refused,
and SHALL leave the previous choice in place.

A request from someone not logged in SHALL be refused.

A request naming a colour the game does not have SHALL be refused.

#### Scenario: An unearned colour is refused

- **WHEN** a request sets an account's ball to a colour that account has not earned
- **THEN** it is refused
- **AND** the account's ball is unchanged

#### Scenario: A colour that does not exist is refused

- **WHEN** a request names a colour outside the game's palette
- **THEN** it is refused

#### Scenario: Without an account the request is refused

- **WHEN** a request to set a ball arrives with no account behind it
- **THEN** it is refused

### Requirement: The choice belongs to the account

The chosen ball SHALL be stored against the player's account, and SHALL be retrieved with it.

Clearing browser storage SHALL NOT lose the choice, as long as the player can sign in again.

Signing out SHALL leave the choice on the account, not on the device: the next player to use
the device SHALL NOT inherit it, and signing back in SHALL find it as it was left.

#### Scenario: The choice survives a cleared browser

- **WHEN** a player who has chosen a colour clears their browser and signs in again
- **THEN** their chosen colour is shown

#### Scenario: The choice does not carry to the next player

- **WHEN** a player signs out
- **THEN** the game continues with no ball shown
- **AND** the chosen colour is not applied to whoever plays next on that device

### Requirement: Earning a ball is not announced

The game SHALL NOT interrupt, prompt, or badge a player because a new colour has become
available to choose.

There SHALL be no notification on completing a level, no dot on the account control, and no
periodic reminder. The picker SHALL only be seen when the player goes looking for it.

This follows the same stance the game takes on accounts: it has nothing to sell, so it has no
reason to pull a player out of a puzzle.

#### Scenario: Completing a level announces nothing about balls

- **WHEN** a player completes a level that earns them a new colour
- **THEN** nothing about the profile ball is shown

#### Scenario: No badge accumulates

- **WHEN** a player has earned colours they have never looked at
- **THEN** the account control looks exactly as it does otherwise
