# Spec Delta

## MODIFIED Requirements

### Requirement: Home page displays player progress tiles

When the player has earned XP, the home page SHALL display progress tiles showing: total XP, current rank (tier and sub-level with tier colour), current campaign level, current day streak, and global leaderboard rank.

The rank tile SHALL include a small progress indicator toward the next sub-level.

When the player holds at least one streak freeze, the streak tile SHALL also show how many they hold. A player holding none SHALL see the streak tile as before, with no freeze indicator.

For anonymous players, the rank tile SHALL show rank without a ring (since there is no profile ball), and the leaderboard rank tile SHALL be hidden (leaderboard requires registration). The remaining tiles SHALL use locally available data, except the streak and freeze count, which come from the server like they do for registered players.

#### Scenario: Registered player sees all progress tiles

- **WHEN** a registered player with 100,000 XP (Silver 1), on level 23, with a 7-day streak and rank #8 visits the home page
- **THEN** progress tiles are displayed: XP (100,000), rank (Silver 1 with silver colour), level (23), streak (7), rank (#8)

#### Scenario: Anonymous player sees limited tiles

- **WHEN** an anonymous player with 2,000 XP on level 5 visits the home page
- **THEN** progress tiles for XP, rank, level, and streak are displayed
- **AND** the leaderboard rank tile is not shown

#### Scenario: Streak tile shows held freezes

- **WHEN** a player with a 15-day streak holding 2 streak freezes visits the home page
- **THEN** the streak tile shows 15 and indicates 2 freezes held

#### Scenario: No freeze indicator without freezes

- **WHEN** a player with a 3-day streak holding no streak freezes visits the home page
- **THEN** the streak tile shows 3 with no freeze indicator
