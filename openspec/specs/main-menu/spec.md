# main-menu Specification

## Purpose
The main menu is the game's front door — a screen that greets the player on launch and provides navigation to gameplay, level selection, and level-code entry.

## Requirements

### Requirement: Main menu is the launch screen

The main menu SHALL serve as both the game's launch screen and the public landing page at the root URL path (`/`). It SHALL display the game's logo (Erlenmeyer flask mark), the game name in the display typeface, and the tagline "Sort the colours. Clear the board." above the play action. Below the hero area, the page SHALL display community stats, player progress tiles, recent games, and the activity feed. The existing functional behaviour (play, level select, code entry, achievements, account access) SHALL remain unchanged.

#### Scenario: Fresh launch shows the menu

- **WHEN** a player opens the game
- **THEN** the home page is displayed at the root path
- **AND** the game logo, name, tagline, and play button are visible
- **AND** community stats, progress tiles, and activity feed are visible below

#### Scenario: Desktop visitor sees branded landing page

- **WHEN** a visitor navigates to the site root on a desktop browser
- **THEN** the branded home page is displayed with play button, community stats, and content sections
- **AND** the layout adapts to the wider viewport

### Requirement: Main menu offers play

The main menu SHALL provide a prominent action to start playing. For a first-time player who has not completed or skipped the tutorial, activating the play action SHALL navigate to the tutorial instead of the gameplay screen. For all other players, it SHALL load the player's current level and transition to the gameplay screen as before.

#### Scenario: Tapping play loads the current level

- **WHEN** a player who was last on level 12 taps play
- **AND** they have previously completed or skipped the tutorial
- **THEN** the game transitions to the gameplay screen with level 12 loaded

#### Scenario: A new player starts at level 1

- **WHEN** a player with no history taps play
- **AND** they have previously completed or skipped the tutorial
- **THEN** the game transitions to the gameplay screen with level 1 loaded

#### Scenario: First-time player is routed to tutorial

- **WHEN** a first-time player taps play
- **AND** they have not completed or skipped the tutorial
- **THEN** the game navigates to the tutorial screen

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

### Requirement: Main menu navigates via URL routing

The main menu's navigation actions (play, level select, achievements) SHALL use the application's URL router to change pages rather than local component state. The back-navigation contract (returning to the menu preserves board state) SHALL remain unchanged.

#### Scenario: Tapping play navigates to the game route

- **WHEN** a player taps Play on the main menu
- **THEN** the browser URL changes to the gameplay route
- **AND** the gameplay screen is displayed

#### Scenario: Tapping level select navigates to the levels route

- **WHEN** a player taps Level Select on the main menu
- **THEN** the browser URL changes to the level select route
- **AND** the level select screen is displayed

### Requirement: Main menu displays player points

When the player has earned points, the main menu SHALL display the total point count, matching the existing behaviour.

#### Scenario: Points displayed for a returning player

- **WHEN** a player with 1,250 total points opens the main menu
- **THEN** the point total is displayed on the menu

### Requirement: Home page displays player progress tiles

When the player has earned points, the home page SHALL display progress tiles showing: total points, current level, current day streak, and global leaderboard rank. The tiles SHALL be visible below the play action.

For anonymous players, the rank tile SHALL be hidden (leaderboard requires registration). The remaining tiles SHALL use locally available data.

#### Scenario: Registered player sees all progress tiles

- **WHEN** a registered player with 58,920 points, on level 23, with a 7-day streak and rank #8 visits the home page
- **THEN** four progress tiles are displayed: points (58,920), level (23), streak (7), rank (#8)

#### Scenario: Anonymous player sees limited tiles

- **WHEN** an anonymous player with 2,000 points on level 5 visits the home page
- **THEN** progress tiles for points, level, and streak are displayed
- **AND** the rank tile is not shown

### Requirement: Home page displays recent games

The home page SHALL display the player's most recent game results. Each entry SHALL show the outcome (won/lost), level number, difficulty, move count or timeout, time ago, and points earned.

Recent games SHALL be limited to a small number of the most recent entries.

#### Scenario: Recent games displayed

- **WHEN** a player who has played 4 games visits the home page
- **THEN** the most recent games are displayed with outcome, level, and score

#### Scenario: No games yet

- **WHEN** a new player with no game history visits the home page
- **THEN** the recent games section is not displayed

### Requirement: Home page displays the activity feed

The home page SHALL include the community activity feed showing recent notable actions by other players. The feed SHALL be fetched from the activity feed endpoint.

#### Scenario: Activity feed on home page

- **WHEN** a player visits the home page
- **THEN** the activity feed is visible showing recent player actions

### Requirement: Home page displays community stats

The home page SHALL display community stats (players online, puzzles solved today, active players this week) in a visible ribbon between the hero area and the content sections.

#### Scenario: Community stats ribbon visible

- **WHEN** a player visits the home page
- **THEN** the community stats ribbon is displayed with current values
