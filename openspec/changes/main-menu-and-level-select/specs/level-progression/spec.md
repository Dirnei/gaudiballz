## ADDED Requirements

### Requirement: Per-level progress is available to the client

The client SHALL be able to retrieve the player's per-level completion data (which levels are completed and the best result for each) so that the level selection screen can display progress state.

#### Scenario: Progress data includes all completed levels

- **WHEN** a player who has completed levels 1 through 10 requests their progress
- **THEN** the response includes an entry for each of those 10 levels with the best moves and hints

#### Scenario: Progress data is available to unauthenticated players

- **WHEN** an anonymous player who has completed levels requests their progress
- **THEN** the per-level data is returned for their anonymous identity

## MODIFIED Requirements

### Requirement: Level gating

Players SHALL only be able to access levels up to their level ceiling. The level ceiling
SHALL be the maximum of:

1. The highest completed level + 1 (from server-side progress),
2. Any locally stored level reached (from localStorage), and
3. Any code-based unlock level.

Attempting to navigate beyond the ceiling SHALL be prevented — the navigation control
SHALL be disabled or hidden when the player is at the ceiling. This applies both to the sequential next/previous controls on the gameplay screen and to the level tiles on the level selection screen.

Advancing to the next level after completing one SHALL be allowed as long as the new
level is within the ceiling.

#### Scenario: A new player can only play level 1

- **WHEN** a player has no progress and no code-based unlock
- **THEN** they can access level 1 only
- **AND** the next-level control is disabled

#### Scenario: Completing a level raises the ceiling

- **WHEN** a player completes level 5
- **THEN** they can access levels 1 through 6

#### Scenario: The next button is disabled at the ceiling

- **WHEN** a player is on their highest accessible level and has not completed it
- **THEN** the next-level control is disabled

#### Scenario: A code-based unlock raises the ceiling

- **WHEN** a player has completed up to level 10 and enters a code for level 30
- **THEN** they can access levels 1 through 30

#### Scenario: Previous levels remain accessible

- **WHEN** a player's ceiling is level 50
- **THEN** they can navigate back to any level from 1 to 50

#### Scenario: Existing progress is preserved

- **WHEN** a player whose server-side highest completed level is 96 loads the game after gating is introduced
- **THEN** their ceiling is at least 97
- **AND** no progress is lost

#### Scenario: Level select grid respects the ceiling

- **WHEN** a player with a ceiling of 31 opens the level selection screen
- **THEN** levels 1 through 31 are tappable
- **AND** levels 32 and above appear locked and are not tappable
