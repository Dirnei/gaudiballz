## ADDED Requirements

### Requirement: Level grid is paginated

The level selection screen SHALL split levels into pages of 50 levels each. Only one
page of tiles SHALL be visible at a time.

When the total number of displayable levels is not a multiple of 50, the last page
SHALL contain the remaining levels.

#### Scenario: A player with ceiling 120 sees pages

- **WHEN** a player with a ceiling of 120 opens the level selection screen
- **THEN** the grid shows one page of 50 level tiles
- **AND** page navigation indicates multiple pages are available

#### Scenario: The last page has fewer than 50 tiles

- **WHEN** the total displayable level count is 73
- **THEN** the last page contains 23 tiles and the first page contains 50

### Requirement: Levels are displayed in descending order

Within each page, level tiles SHALL be arranged in descending numerical order
(highest level number first). The first page SHALL contain the highest-numbered
levels.

#### Scenario: Descending order on the first page

- **WHEN** a player with a ceiling of 100 opens the level selection screen
- **THEN** the first visible tile is for the highest displayable level
- **AND** tiles are numbered in descending order within the page

#### Scenario: Later pages contain lower-numbered levels

- **WHEN** a player navigates to the last page
- **THEN** that page contains the lowest-numbered levels, starting from level 1

### Requirement: Page navigation controls

The level selection screen SHALL provide controls to move between pages. The controls
SHALL include previous-page and next-page actions and a visual indicator of the
current page position.

The previous-page control SHALL be disabled on the first page. The next-page control
SHALL be disabled on the last page.

#### Scenario: Navigating to the next page

- **WHEN** a player is on the first page and activates the next-page control
- **THEN** the grid displays the next page of levels

#### Scenario: Previous-page is disabled on the first page

- **WHEN** a player is on the first page
- **THEN** the previous-page control is disabled

#### Scenario: Next-page is disabled on the last page

- **WHEN** a player is on the last page
- **THEN** the next-page control is disabled

### Requirement: Default page contains the current level

When the level selection screen opens, it SHALL default to the page that contains the
player's current level (the level they were most recently playing). If the player has
no current level, the first page (highest levels) SHALL be shown.

#### Scenario: Opening with a current level on page 2

- **WHEN** a player whose current level is 60 opens the level selection screen
  and level 60 falls on the second page
- **THEN** the grid opens showing that second page

#### Scenario: Opening with no current level

- **WHEN** a player with no current level opens the level selection screen
- **THEN** the first page is shown

## MODIFIED Requirements

### Requirement: Level select shows a grid of levels

The level selection screen SHALL display levels as a paginated grid of numbered tiles.
Each tile SHALL show the level number. Tiles SHALL be arranged in descending order
within each page, and each page SHALL contain up to 50 tiles.

#### Scenario: The grid is populated

- **WHEN** a player opens the level selection screen
- **THEN** levels are displayed as a grid of numbered tiles in descending order
- **AND** the page contains at most 50 tiles
