## ADDED Requirements

### Requirement: Level gating

Players SHALL only be able to access levels up to their level ceiling. The level ceiling
SHALL be the maximum of:

1. The highest completed level + 1 (from server-side progress),
2. Any locally stored level reached (from localStorage), and
3. Any code-based unlock level.

Attempting to navigate beyond the ceiling SHALL be prevented — the navigation control
SHALL be disabled or hidden when the player is at the ceiling.

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
