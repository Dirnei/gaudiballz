## ADDED Requirements

### Requirement: The header provides tabbed navigation

The header SHALL include navigation tabs for the hub's primary sections: Home, Leaderboard, and Your Stats. The currently active section SHALL be visually indicated. Tabs SHALL use the application's URL router to navigate.

#### Scenario: Navigating to leaderboard via tab

- **WHEN** a player taps the Leaderboard tab in the header
- **THEN** the browser URL changes to the leaderboard route
- **AND** the leaderboard page is displayed
- **AND** the Leaderboard tab is visually marked as active

#### Scenario: Active tab reflects current route

- **WHEN** a player is on the stats page
- **THEN** the Your Stats tab is visually indicated as active

#### Scenario: Tabs are visible on all shell pages

- **WHEN** a player is on any page rendered inside the shell (home, leaderboard, stats, legal)
- **THEN** the navigation tabs are visible in the header

## MODIFIED Requirements

### Requirement: Non-game pages render inside a shared shell

All pages except the gameplay screen SHALL render inside a shared layout that includes a header and a footer. The header SHALL display the game logo, navigation tabs, and the account button. The footer SHALL contain links to legal pages.

#### Scenario: Shell is visible on the home page

- **WHEN** a user visits the home page
- **THEN** the page includes a header with the game logo, navigation tabs, and account button, and a footer with legal links

#### Scenario: Shell is visible on legal pages

- **WHEN** a user visits the Impressum page
- **THEN** the page includes the same header and footer as the home page

### Requirement: The header displays the game identity

The header SHALL display the game's logo mark and name. The logo SHALL link to the home page. On narrow viewports, the wordmark MAY be hidden while the logo mark remains visible.

#### Scenario: Clicking the header logo navigates home

- **WHEN** a user is on the Impressum page and clicks the logo in the header
- **THEN** the home page is displayed

#### Scenario: Narrow viewport hides wordmark

- **WHEN** the viewport is narrower than 640px
- **THEN** the logo mark is visible but the text wordmark is hidden
