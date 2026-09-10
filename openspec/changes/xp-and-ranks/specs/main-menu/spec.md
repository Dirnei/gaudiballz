## MODIFIED Requirements

### Requirement: Home page displays player progress tiles

When the player has earned XP, the home page SHALL display progress tiles showing: total XP, current rank (tier and sub-level with tier colour), current campaign level, current day streak, and global leaderboard rank.

The rank tile SHALL include a small progress indicator toward the next sub-level.

For anonymous players, the rank tile SHALL show rank without a ring (since there is no profile ball), and the leaderboard rank tile SHALL be hidden (leaderboard requires registration). The remaining tiles SHALL use locally available data.

#### Scenario: Registered player sees all progress tiles

- **WHEN** a registered player with 100,000 XP (Silver 1), on level 23, with a 7-day streak and rank #8 visits the home page
- **THEN** progress tiles are displayed: XP (100,000), rank (Silver 1 with silver colour), level (23), streak (7), rank (#8)

#### Scenario: Anonymous player sees limited tiles

- **WHEN** an anonymous player with 2,000 XP on level 5 visits the home page
- **THEN** progress tiles for XP, rank, level, and streak are displayed
- **AND** the leaderboard rank tile is not shown

### Requirement: Main menu displays player XP

When the player has earned XP, the main menu SHALL display the total XP count, matching the previous total-points display.

#### Scenario: XP displayed for a returning player

- **WHEN** a player with 1,250 total XP opens the main menu
- **THEN** the XP total is displayed on the menu
