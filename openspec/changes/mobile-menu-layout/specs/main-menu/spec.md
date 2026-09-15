## ADDED Requirements

### Requirement: Main menu is usable on mobile viewports

The main menu layout SHALL adapt to narrow viewports so that all content is reachable and all interactive elements are comfortably tappable on screens as narrow as 320px. No content SHALL overflow the viewport horizontally or require horizontal scrolling to reach.

#### Scenario: Menu fits a 320px-wide screen

- **WHEN** a player opens the main menu on a device with a 320px-wide viewport
- **THEN** no content overflows the viewport horizontally
- **AND** all action buttons, progress tiles, stats chips, and feed entries are fully visible

#### Scenario: Action buttons are easy to tap on mobile

- **WHEN** a player views the main menu on a viewport narrower than 480px
- **THEN** action buttons are large enough to tap comfortably without accidentally hitting a neighbour

#### Scenario: Progress tiles fit narrow screens

- **WHEN** a player with progress data views the main menu on a viewport narrower than 380px
- **THEN** all progress tiles are fully visible without horizontal overflow

#### Scenario: Hero text does not dominate small screens

- **WHEN** a player opens the main menu on a viewport narrower than 480px
- **THEN** the game title text is smaller than on desktop so it does not consume a disproportionate share of the visible area

#### Scenario: Desktop layout is unchanged

- **WHEN** a player opens the main menu on a desktop viewport (600px or wider)
- **THEN** the layout is visually identical to the current design
