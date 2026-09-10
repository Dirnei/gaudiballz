## MODIFIED Requirements

### Requirement: Player stats view shows aggregated personal statistics

The player stats view SHALL display the following for the authenticated player: total XP, games played, games won, win rate (percentage), highest level completed, best moves on any single level (with which level), current day streak, and global leaderboard rank.

All numeric values SHALL be computed server-side and served in a single response.

#### Scenario: A registered player views their stats

- **WHEN** a registered player opens the stats view
- **THEN** they see their total XP, games played, win count, win rate, highest level, best moves, current streak, and global rank

#### Scenario: Win rate computation

- **WHEN** a player has played 167 games and won 110
- **THEN** their win rate is displayed as 66%

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

## REMOVED Requirements

### Requirement: Player stats view shows level progress

**Reason**: Replaced by rank progress, which provides a more meaningful measure of advancement than campaign level completion percentage.

**Migration**: The rank progress display covers the same intent (showing how far the player has come) using XP and rank tiers instead of level count.
