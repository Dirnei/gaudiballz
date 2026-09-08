## MODIFIED Requirements

### Requirement: Main menu is the launch screen

The main menu SHALL serve as both the game's launch screen and the public landing page at the root URL path (`/`). It SHALL display the game's logo (Erlenmeyer flask mark), the game name in the display typeface, and the tagline "Sort the colours. Clear the board." above the play action. The existing functional behaviour (play, level select, code entry, achievements, account access) SHALL remain unchanged.

#### Scenario: Fresh launch shows the menu

- **WHEN** a player opens the game
- **THEN** the main menu is displayed at the root path
- **AND** the game logo, name, and tagline are visible above the play button

#### Scenario: Desktop visitor sees branded landing page

- **WHEN** a visitor navigates to the site root on a desktop browser
- **THEN** the branded landing page is displayed with the play button prominently visible
- **AND** the layout adapts to the wider viewport without appearing stretched or off-centre

## ADDED Requirements

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
