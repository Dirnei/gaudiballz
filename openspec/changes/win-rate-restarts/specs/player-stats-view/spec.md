## MODIFIED Requirements

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
