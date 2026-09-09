## Purpose

Surfaces live aggregate numbers — who is playing and how much is being solved — so every player sees the game as a living community, not a solo experience.

## ADDED Requirements

### Requirement: The system tracks players currently online

The system SHALL maintain an approximate count of players who have the game open. A player SHALL be counted as online while their client maintains an active connection or heartbeat. A player who closes the game or loses connectivity SHALL stop being counted within a reasonable period.

#### Scenario: A player opens the game

- **WHEN** a player opens the game in their browser
- **THEN** the online player count increases by one

#### Scenario: A player closes the game

- **WHEN** a player closes the browser tab
- **THEN** the online player count decreases within a short period

### Requirement: The system tracks puzzles solved today

The system SHALL maintain a count of level completions that occurred on the current UTC date. The count SHALL reset at the start of each new UTC day.

Both anonymous and registered player completions SHALL contribute to this count.

#### Scenario: A completion increments the daily count

- **WHEN** a player completes a level
- **THEN** the puzzles-solved-today count increases by one

#### Scenario: Count resets at midnight UTC

- **WHEN** a new UTC day begins
- **THEN** the puzzles-solved-today count resets to zero

### Requirement: The system tracks active players this week

The system SHALL maintain a count of distinct players who have completed at least one level during the current ISO week (Monday through Sunday UTC).

Both anonymous and registered players SHALL be counted.

#### Scenario: A player's first completion of the week

- **WHEN** a player who has not completed a level this week completes one
- **THEN** the active-players-this-week count increases by one

#### Scenario: Repeat completions do not inflate the count

- **WHEN** a player who has already completed a level this week completes another
- **THEN** the active-players-this-week count does not change

### Requirement: Community stats are served to the client

The system SHALL provide an endpoint that returns the current values of all community stats: online player count, puzzles solved today, and active players this week.

The response SHALL be suitable for display without further computation by the client.

#### Scenario: Fetching community stats

- **WHEN** the client requests community stats
- **THEN** the response includes the current online count, today's solve count, and this week's active player count

### Requirement: Community stats are visible on the home page

The home page SHALL display the community stats in a visible ribbon or bar. The stats SHALL be fetched when the home page loads and SHALL NOT require the player to be registered.

#### Scenario: Anonymous player sees community stats

- **WHEN** an anonymous player visits the home page
- **THEN** the community stats are visible

#### Scenario: Stats reflect current values on load

- **WHEN** a player navigates to the home page
- **THEN** the displayed community stats reflect the values at the time of the request
