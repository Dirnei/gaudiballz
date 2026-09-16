## MODIFIED Requirements

### Requirement: Leaderboard ranks players by total points

The system SHALL provide a leaderboard that ranks all registered players in descending order of total XP. Anonymous players SHALL NOT appear on the leaderboard.

Players with equal total XP SHALL be ordered by who reached that total first.

Each leaderboard entry SHALL display the player's rank badge (tier icon or label) and rank ring around their profile ball, alongside rank number, player name, total XP, games played, and win rate.

Games played SHALL be the number of recorded attempts, and win rate SHALL be the share of
those attempts that ended in completion. A player with no recorded attempts SHALL have no
win rate shown rather than a win rate of zero.

#### Scenario: Players ranked by points

- **WHEN** a player views the leaderboard
- **THEN** players are listed in descending order of total XP
- **AND** each entry shows rank number, player name, total XP, games played, win rate, rank badge, and rank ring on the profile ball

#### Scenario: Rank badge visible on entries

- **WHEN** a Gold-tier player appears on the leaderboard
- **THEN** their entry shows a gold rank badge and their profile ball has a gold ring

#### Scenario: Anonymous players excluded

- **WHEN** an anonymous player has 5,000 XP
- **THEN** they do not appear on the leaderboard

#### Scenario: Win rate reflects attempts

- **WHEN** a listed player has recorded 20 attempts of which 15 ended in completion
- **THEN** their entry shows 20 games played and a win rate of 75%

### Requirement: Leaderboard supports time-period filtering

The leaderboard SHALL support three time periods: all time, this week (current ISO week, Monday through Sunday), and today (current UTC date).

The "this week" and "today" views SHALL rank players by XP earned within that period, not their all-time total.

In a period view, games played and win rate SHALL describe only the attempts made within
that period, so a player's weekly win rate is independent of their all-time one.

#### Scenario: Switching to weekly view

- **WHEN** a player selects the "This Week" period
- **THEN** the leaderboard shows players ranked by XP earned during the current ISO week

#### Scenario: Daily view shows today's earners

- **WHEN** a player selects the "Today" period
- **THEN** only players who earned XP today (UTC) appear, ranked by today's XP

#### Scenario: Period win rate counts only that period

- **WHEN** a player has completed 2 of 4 attempts today and 90 of 100 attempts all time
- **THEN** the "Today" view shows a 50% win rate for them
- **AND** the "All Time" view shows 90%
