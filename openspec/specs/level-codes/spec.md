# level-codes Specification

## Purpose

Gives every level a short alphanumeric code that a player can write down and enter later
to recover their position, so anonymous players have a recovery path that does not require
creating an account.

## Requirements

### Requirement: Every level has a code

Each level SHALL have a unique, short alphanumeric code. The code SHALL be deterministic —
the same level always produces the same code. Codes SHALL be case-insensitive for entry
purposes.

The code SHALL be short enough to write on a sticky note (at most 6 characters) and SHALL
avoid visually ambiguous characters (0/O, 1/I/l).

#### Scenario: A level's code is stable

- **WHEN** the code for level 42 is requested twice
- **THEN** both requests return the same code

#### Scenario: Codes are unique per level

- **WHEN** the codes for two different levels are compared
- **THEN** they are different

#### Scenario: Codes are short and legible

- **WHEN** a level code is generated
- **THEN** it contains at most 6 alphanumeric characters
- **AND** it does not contain the characters 0, O, 1, I, or l

### Requirement: Code is displayed to the player

The game SHALL display the code for the player's current level in the UI, in a location
that is visible without opening a menu or overlay. The code SHALL be easy to copy or
write down.

#### Scenario: The code is visible during play

- **WHEN** a player is on a level
- **THEN** the level code is displayed on screen

#### Scenario: The code updates when the level changes

- **WHEN** the player advances to a new level
- **THEN** the displayed code updates to the new level's code

### Requirement: Entering a valid code unlocks levels

When a player enters a valid level code, the game SHALL unlock all levels up to and
including the level that code represents. The player SHALL be navigated to that level.

The unlock SHALL persist in the browser so the player does not need to re-enter the code
on each visit.

#### Scenario: A valid code unlocks the level

- **WHEN** a player enters the code for level 50
- **THEN** levels 1 through 50 are unlocked
- **AND** the player is navigated to level 50

#### Scenario: The unlock persists

- **WHEN** a player enters a code and later returns to the game
- **THEN** the unlocked levels are still accessible

#### Scenario: A higher code raises the ceiling

- **WHEN** a player who has completed up to level 30 enters the code for level 50
- **THEN** the level ceiling becomes 50

#### Scenario: A lower code does not reduce progress

- **WHEN** a player who has completed up to level 50 enters the code for level 20
- **THEN** the level ceiling remains at least 51 (highestCompleted + 1)

### Requirement: Invalid codes are rejected

When a player enters a code that does not correspond to any level, the game SHALL tell
them the code is invalid. No state SHALL change.

#### Scenario: A made-up code is rejected

- **WHEN** a player enters a string that is not a valid level code
- **THEN** the game indicates the code is invalid
- **AND** no levels are unlocked

### Requirement: Code validation is server-side

The server SHALL be the authority on whether a code is valid and which level it unlocks.
The client SHALL NOT contain the logic to generate or reverse codes, so that the mapping
cannot be extracted from client-side source.

#### Scenario: The client delegates validation to the server

- **WHEN** a player enters a code
- **THEN** the client sends it to the server for validation
- **AND** the server returns the level number or an invalid response

### Requirement: Code entry is accessible without an account

The code entry flow SHALL be available to all players, including those who have never
created an account. No sign-in or account creation SHALL be required to enter a code.

#### Scenario: An anonymous player enters a code

- **WHEN** a player with no account enters a valid code
- **THEN** the levels are unlocked the same as for any other player
