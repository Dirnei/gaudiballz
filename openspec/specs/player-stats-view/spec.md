# player-stats-view Specification

## Purpose
Gives a registered player a dedicated view of their own performance — points, levels, streaks, and achievements at a glance — so they can track progress without digging through individual levels.

## Requirements

### Requirement: Player stats view shows aggregated personal statistics

The player stats view SHALL display the following for the authenticated player: total XP, games played, games won, win rate (percentage), highest level completed, best moves on any single level (with which level), current day streak, and global leaderboard rank.

Games played SHALL be the number of recorded attempts and games won the number that ended
in completion, so an attempt ended by restarting or by leaving the level counts against the
win rate. A player with no recorded attempts SHALL have no win rate shown rather than a win
rate of zero.

All numeric values SHALL be computed server-side and served in a single response.

#### Scenario: A registered player views their stats

- **WHEN** a registered player opens the stats view
- **THEN** they see their total XP, games played, win count, win rate, highest level, best moves, current streak, and global rank

#### Scenario: Win rate computation

- **WHEN** a player has played 167 games and won 110
- **THEN** their win rate is displayed as 66%

#### Scenario: Restarts count against the win rate

- **WHEN** a player restarts a level twice and then completes it, having played nothing else
- **THEN** their stats show 3 games played, 1 game won, and a win rate of 33%

#### Scenario: A player who has not played since the feature shipped

- **WHEN** a player has cleared levels in the past but recorded no attempts since attempt
  tracking began
- **THEN** their stats show no win rate rather than 0%

### Requirement: Player stats view shows achievements summary

The stats view SHALL show the player's achievements grouped by category, displaying each achievement's name, description, icon, and earned/locked state. Earned achievements SHALL be visually distinct from locked ones. The count of earned vs total achievements SHALL be displayed.

For locked achievements that have a defined threshold, the stats view SHALL display a progress indicator showing the player's current progress toward earning the achievement.

#### Scenario: Achievements summary

- **WHEN** a player has earned 8 of 20 achievements
- **THEN** the stats view shows "8 / 20 unlocked" and all 20 achievements with earned ones visually distinct

#### Scenario: Achievement descriptions visible

- **WHEN** a player views the achievements section on the stats page
- **THEN** each achievement shows its description text explaining how to earn it

#### Scenario: Progress shown for locked threshold achievement

- **WHEN** a player has completed 3 levels and has not yet earned the "Complete 5 levels" achievement
- **THEN** the achievement shows a progress indicator displaying "3 / 5"

#### Scenario: No progress for non-threshold achievement

- **WHEN** a locked achievement has no defined threshold
- **THEN** no progress indicator is shown for that achievement

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

### Requirement: Player stats view shows rank progress

The stats view SHALL show the player's current rank (tier and sub-level), a visual progress indicator toward the next rank boundary, and the XP values for the current and next threshold.

This SHALL replace the previous level-progress display.

#### Scenario: Rank progress display

- **WHEN** a player with 100,000 XP (Silver 1) opens the stats view
- **THEN** the stats view shows "Silver 1", a progress bar toward Silver 2, and "100,000 / 120,000 XP"

#### Scenario: Maximum rank display

- **WHEN** a Diamond 5 player opens the stats view
- **THEN** the rank progress shows "Diamond 5" with no further threshold

### Requirement: Player stats view shows badge shelf

The stats view SHALL include the badge shelf section as specified in the badge-shelf capability.

#### Scenario: Badge shelf visible on stats page

- **WHEN** a registered player opens the stats view
- **THEN** the badge shelf is visible below the stats summary
