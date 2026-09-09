# player-stats-view Specification

## Purpose
Gives a registered player a dedicated view of their own performance — points, levels, streaks, and achievements at a glance — so they can track progress without digging through individual levels.

## Requirements

### Requirement: Player stats view shows aggregated personal statistics

The player stats view SHALL display the following for the authenticated player: total points, games played, games won, win rate (percentage), highest level completed, best moves on any single level (with which level), current day streak, and global leaderboard rank.

All numeric values SHALL be computed server-side and served in a single response.

#### Scenario: A registered player views their stats

- **WHEN** a registered player opens the stats view
- **THEN** they see their total points, games played, win count, win rate, highest level, best moves, current streak, and global rank

#### Scenario: Win rate computation

- **WHEN** a player has played 167 games and won 110
- **THEN** their win rate is displayed as 66%

### Requirement: Player stats view shows level progress

The stats view SHALL show the player's progress through the available levels as a fraction and a visual indicator (e.g., "23 of 50 levels completed").

#### Scenario: Level progress display

- **WHEN** a player has completed 23 out of 50 available levels
- **THEN** the stats view shows "23 of 50" and a corresponding progress indicator

### Requirement: Player stats view shows achievements summary

The stats view SHALL show the player's achievements as a grid displaying each achievement's name, icon, and earned/locked state. Earned achievements SHALL be visually distinct from locked ones. The count of earned vs total achievements SHALL be displayed.

#### Scenario: Achievements summary

- **WHEN** a player has earned 8 of 12 achievements
- **THEN** the stats view shows "8 / 12 unlocked" and all 12 achievements with earned ones visually distinct

### Requirement: Player stats view is accessible at a dedicated URL

The player stats view SHALL be accessible at a dedicated URL path and reachable from the main navigation. It SHALL require the player to be registered; anonymous players who navigate to it SHALL be shown a prompt to register or sign in.

#### Scenario: Direct URL access by registered player

- **WHEN** a registered player navigates to the stats URL directly
- **THEN** the stats view is displayed with their data

#### Scenario: Anonymous player redirected

- **WHEN** an anonymous player navigates to the stats URL
- **THEN** they see a message indicating registration is needed to view stats

### Requirement: Player stats include contextual comparisons

Where meaningful, stats SHALL include a brief contextual note comparing the player to the community (e.g., "Top 5% of all players", "3 levels ahead of average", "Up 3 places this week").

The comparisons SHALL be computed server-side. If comparison data is unavailable, the stat SHALL be shown without a comparison rather than showing stale or fabricated data.

#### Scenario: Rank change shown

- **WHEN** a player's rank improved by 3 places since last week
- **THEN** the rank stat includes a note like "Up 3 places this week"

#### Scenario: No comparison available

- **WHEN** the server cannot compute a comparison for a stat
- **THEN** the stat is shown without a comparison note
