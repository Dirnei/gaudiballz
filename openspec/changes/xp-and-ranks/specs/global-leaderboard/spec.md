## MODIFIED Requirements

### Requirement: Leaderboard ranks players by total XP

The system SHALL provide a leaderboard that ranks all registered players in descending order of total XP. Anonymous players SHALL NOT appear on the leaderboard.

Players with equal total XP SHALL be ordered by who reached that total first.

Each leaderboard entry SHALL display the player's rank badge (tier icon or label) and rank ring around their profile ball, alongside rank number, player name, total XP, games played, and win rate.

#### Scenario: Players ranked by XP

- **WHEN** a player views the leaderboard
- **THEN** players are listed in descending order of total XP
- **AND** each entry shows rank number, player name, total XP, games played, win rate, rank badge, and rank ring on the profile ball

#### Scenario: Rank badge visible on entries

- **WHEN** a Gold-tier player appears on the leaderboard
- **THEN** their entry shows a gold rank badge and their profile ball has a gold ring

#### Scenario: Anonymous players excluded

- **WHEN** an anonymous player has 5,000 XP
- **THEN** they do not appear on the leaderboard

### Requirement: Leaderboard supports time-period filtering

The leaderboard SHALL support three time periods: all time, this week (current ISO week, Monday through Sunday), and today (current UTC date).

The "this week" and "today" views SHALL rank players by XP earned within that period, not their all-time total.

#### Scenario: Switching to weekly view

- **WHEN** a player selects the "This Week" period
- **THEN** the leaderboard shows players ranked by XP earned during the current ISO week

#### Scenario: Daily view shows today's earners

- **WHEN** a player selects the "Today" period
- **THEN** only players who earned XP today (UTC) appear, ranked by today's XP
