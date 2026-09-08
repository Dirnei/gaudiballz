# main-menu Specification

## Purpose
The main menu is the game's front door — a screen that greets the player on launch and provides navigation to gameplay, level selection, and level-code entry.

## Requirements

### Requirement: Main menu is the launch screen

The game SHALL display the main menu screen when the application starts, rather than loading directly into gameplay.

#### Scenario: Fresh launch shows the menu

- **WHEN** a player opens the game
- **THEN** the main menu screen is displayed
- **AND** no level is loaded until the player chooses to play

### Requirement: Main menu offers play

The main menu SHALL provide a prominent action to start playing. Activating it SHALL load the player's current level (the last level they were on, or level 1 for a new player) and transition to the gameplay screen.

#### Scenario: Tapping play loads the current level

- **WHEN** a player who was last on level 12 taps play
- **THEN** the game transitions to the gameplay screen with level 12 loaded

#### Scenario: A new player starts at level 1

- **WHEN** a player with no history taps play
- **THEN** the game transitions to the gameplay screen with level 1 loaded

### Requirement: Main menu offers level selection

The main menu SHALL provide an action to open the level selection screen.

#### Scenario: Navigating to level select

- **WHEN** a player activates the level selection option on the main menu
- **THEN** the level selection screen is displayed

### Requirement: Main menu offers level-code entry

The main menu SHALL provide a way to enter a level code directly, without navigating to another screen or opening an overlay. The code entry flow SHALL behave identically to the existing code entry (server-side validation, ceiling raise, navigation to the unlocked level) but SHALL transition to the gameplay screen on success.

#### Scenario: Entering a valid code from the menu

- **WHEN** a player enters a valid level code on the main menu
- **THEN** levels up to and including that level are unlocked
- **AND** the game transitions to the gameplay screen with that level loaded

#### Scenario: Entering an invalid code on the menu

- **WHEN** a player enters an invalid code on the main menu
- **THEN** the game indicates the code is invalid
- **AND** the player remains on the main menu

### Requirement: Main menu provides access to the account panel

The main menu SHALL provide access to the account panel (login, register, logout) so the player can manage their identity without entering gameplay first.

#### Scenario: Opening the account panel from the menu

- **WHEN** a player activates the account option on the main menu
- **THEN** the account panel is displayed

### Requirement: Returning to the main menu from gameplay

The gameplay screen SHALL provide a way to return to the main menu. Navigating back SHALL NOT discard in-progress moves on the current level — the player's board state SHALL be preserved when they return.

#### Scenario: Going back to the menu mid-level

- **WHEN** a player has made moves on a level and navigates back to the main menu
- **THEN** the main menu is displayed

#### Scenario: Resuming after returning to the menu

- **WHEN** a player returns to gameplay after visiting the main menu
- **THEN** the level and board state are as they left them
