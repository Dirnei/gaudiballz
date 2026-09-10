# global-leaderboard Specification

## Purpose
Ranks players globally by total points so they can see where they stand, who is ahead, and track their climb over time.

## Requirements

### Requirement: Leaderboard ranks players by total points

The system SHALL provide a leaderboard that ranks all registered players in descending order of total points. Anonymous players SHALL NOT appear on the leaderboard.

Each leaderboard entry SHALL include the player's profile ball colour so the client can render it. If the player has chosen a ball, that value SHALL be included. If not, the field SHALL be null and the client SHALL derive the colour from the username.

Players with equal total points SHALL be ordered by who reached that total first.

#### Scenario: Players ranked by points

- **WHEN** a player views the leaderboard
- **THEN** players are listed in descending order of total points
- **AND** each entry shows rank, player name, profile ball, total points, games played, and win rate

#### Scenario: Anonymous players excluded

- **WHEN** an anonymous player has 5,000 points
- **THEN** they do not appear on the leaderboard

### Requirement: Leaderboard supports time-period filtering

The leaderboard SHALL support three time periods: all time, this week (current ISO week, Monday through Sunday), and today (current UTC date).

The "this week" and "today" views SHALL rank players by points earned within that period, not their all-time total.

#### Scenario: Switching to weekly view

- **WHEN** a player selects the "This Week" period
- **THEN** the leaderboard shows players ranked by points earned during the current ISO week

#### Scenario: Daily view shows today's earners

- **WHEN** a player selects the "Today" period
- **THEN** only players who earned points today (UTC) appear, ranked by today's points

### Requirement: Leaderboard highlights the viewer's own rank

When the viewing player is registered and has a rank, the leaderboard SHALL visually distinguish their row from other rows. If the viewer's rank is not in the currently visible portion of the list, their position SHALL still be indicated.

#### Scenario: Viewer's row is highlighted

- **WHEN** a registered player views the all-time leaderboard and they are rank 8
- **THEN** rank 8 is visually distinct from the surrounding rows

#### Scenario: Viewer not in the visible range

- **WHEN** a player ranked 247 views the top 20
- **THEN** their rank and score are shown separately from the main list

### Requirement: Top three players receive podium treatment

The top three players in any time period SHALL be displayed with a visually prominent podium layout, distinct from the remaining ranked list.

#### Scenario: Podium for top three

- **WHEN** a player views the leaderboard
- **THEN** ranks 1, 2, and 3 are displayed in a podium layout above the ranked table

### Requirement: Leaderboard is a navigable page

The leaderboard SHALL be accessible at a dedicated URL path and reachable from the main navigation. Direct navigation to the leaderboard URL SHALL render it without requiring click-through from the home page.

#### Scenario: Direct URL access

- **WHEN** a user navigates to the leaderboard URL directly
- **THEN** the leaderboard page is displayed

### Requirement: Leaderboard data is paginated

The leaderboard SHALL return results in pages. The initial page SHALL show the top-ranked players. The client SHALL be able to request additional pages.

#### Scenario: Loading more results

- **WHEN** a player scrolls past the initial set of leaderboard entries
- **THEN** additional entries are loaded without replacing the already-visible ones
