## MODIFIED Requirements

### Requirement: Leaderboard entries show player details

Each entry on the per-level leaderboard SHALL display the player's rank number, username, star rating, move count, and elapsed time.

Where the leaderboard is shown at full width, each entry SHALL additionally display the player's profile ball and rank badge.

Where the leaderboard is shown in a constrained space, such as the dialog presented on completing a level, the profile ball and rank badge SHALL be omitted, and the star rating SHALL be shown as a count rather than as one mark per star.

The star rating SHALL remain visible in every presentation, because it is the primary ranking key and without it the ordering of entries cannot be accounted for by anything on screen.

#### Scenario: Entry contents

- **WHEN** a player views the level 10 leaderboard on the level-select screen
- **THEN** each entry shows rank number, username, profile ball with rank ring, rank badge, stars, moves, and elapsed time

#### Scenario: Entry contents on completing a level

- **WHEN** a player completes level 10 and opens the leaderboard in the completion dialog
- **THEN** each entry shows rank number, username, star count, moves, and elapsed time
- **AND** no profile ball or rank badge is shown

#### Scenario: Ordering stays accountable in the compact view

- **WHEN** the top entry has 3 stars in 20 moves and the second has 2 stars in 14 moves
- **THEN** the compact view still shows each entry's star count
- **AND** the higher-ranked entry is visibly the one with more stars despite its worse moves
