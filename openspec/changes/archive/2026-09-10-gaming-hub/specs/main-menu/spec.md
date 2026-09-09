## ADDED Requirements

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

## MODIFIED Requirements

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
