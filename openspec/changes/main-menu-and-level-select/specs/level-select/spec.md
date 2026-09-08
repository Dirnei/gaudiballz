## Purpose

The level selection screen lets players browse all levels, see their progress at a glance, and jump to any unlocked level instead of navigating one step at a time.

## ADDED Requirements

### Requirement: Level select shows a grid of levels

The level selection screen SHALL display levels as a scrollable grid of numbered tiles. Each tile SHALL show the level number.

#### Scenario: The grid is populated

- **WHEN** a player opens the level selection screen
- **THEN** levels are displayed as a grid of numbered tiles

### Requirement: Tiles reflect completion state

Each level tile SHALL visually distinguish between four states:

1. **Completed** — the player has finished this level.
2. **Current** — the level the player was most recently playing.
3. **Unlocked** — accessible but not yet completed.
4. **Locked** — beyond the player's ceiling.

#### Scenario: A completed level is visually distinct

- **WHEN** a player has completed level 5
- **THEN** the tile for level 5 is shown in the completed state

#### Scenario: The current level is highlighted

- **WHEN** a player was last on level 12
- **THEN** the tile for level 12 is shown in the current state

#### Scenario: Locked levels are visually distinct

- **WHEN** a player's ceiling is level 15
- **THEN** tiles for levels 16 and above are shown in the locked state

### Requirement: Tapping an unlocked tile starts that level

Tapping a tile for a level at or below the player's ceiling SHALL transition to the gameplay screen with that level loaded.

#### Scenario: Selecting an unlocked level

- **WHEN** a player taps the tile for level 8, which is below their ceiling
- **THEN** the game transitions to the gameplay screen with level 8 loaded

### Requirement: Locked tiles are not selectable

Tapping a tile for a level above the player's ceiling SHALL have no effect. The tile SHALL appear disabled or inactive.

#### Scenario: Tapping a locked level

- **WHEN** a player taps the tile for level 20, which is above their ceiling of 15
- **THEN** nothing happens
- **AND** the player remains on the level selection screen

### Requirement: Level select respects the ceiling

The level selection screen SHALL use the same ceiling logic as the rest of the game (highest completed + 1, code-based unlock, locally stored unlock — whichever is greatest). No separate gating logic SHALL exist.

#### Scenario: Ceiling from completion progress

- **WHEN** a player has completed up to level 30
- **THEN** levels 1 through 31 are unlocked in the grid

#### Scenario: Ceiling raised by a code

- **WHEN** a player enters a code for level 50 and then opens level select
- **THEN** levels 1 through 50 are unlocked in the grid

### Requirement: Level select shows best result on completed tiles

Completed level tiles SHALL show the player's best move count for that level, so the player can see at a glance how they performed.

#### Scenario: Best moves shown on a completed tile

- **WHEN** a player's best result on level 5 is 14 moves
- **THEN** the tile for level 5 shows 14

### Requirement: Returning from level select

The level selection screen SHALL provide a way to return to the main menu.

#### Scenario: Going back to the menu

- **WHEN** a player is on the level selection screen and navigates back
- **THEN** the main menu is displayed
