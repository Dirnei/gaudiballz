## Purpose

Shows the top 10 players worldwide for each level so players can compare their performance on a specific puzzle against the best, with time-period filtering to highlight recent activity.

## Requirements

### Requirement: Per-level leaderboard ranks players by performance

Each level SHALL have a leaderboard ranking registered players by their best result on that level.

Ranking SHALL use stars (descending), then moves (ascending), then elapsed time (ascending) as tiebreakers, in that order. A player with more stars always ranks above a player with fewer, regardless of moves or time.

The leaderboard SHALL show at most 10 entries.

Anonymous players SHALL NOT appear on the leaderboard. Anonymous players SHALL be able to view it.

#### Scenario: Players ranked by stars then moves

- **WHEN** player A has 3 stars in 12 moves and player B has 3 stars in 14 moves on level 5
- **THEN** the level 5 leaderboard ranks player A above player B

#### Scenario: Stars outrank moves

- **WHEN** player A has 2 stars in 8 moves and player B has 3 stars in 15 moves on level 5
- **THEN** the level 5 leaderboard ranks player B above player A

#### Scenario: Time breaks a tie on stars and moves

- **WHEN** player A has 3 stars in 10 moves in 25 seconds and player B has 3 stars in 10 moves in 18 seconds on level 5
- **THEN** the level 5 leaderboard ranks player B above player A

#### Scenario: At most 10 entries

- **WHEN** 15 registered players have completed level 5
- **THEN** the leaderboard shows only the top 10

#### Scenario: Anonymous players are excluded

- **WHEN** an anonymous player has the best result on a level
- **THEN** they do not appear on that level's leaderboard

#### Scenario: Anonymous players can view

- **WHEN** an anonymous player requests the leaderboard for a level
- **THEN** the top 10 are returned

### Requirement: Leaderboard supports time-period filtering

The per-level leaderboard SHALL support three time periods: all time, this week (current ISO week, Monday through Sunday), and today (current UTC date).

The "this week" and "today" views SHALL rank players by their best result achieved within that period, not their all-time best.

The default view SHALL be all time.

#### Scenario: All-time view shows the best result ever

- **WHEN** a player views the all-time leaderboard for level 5
- **THEN** players are ranked by their best result across all completions of level 5

#### Scenario: Weekly view shows this week's best

- **WHEN** a player selects "This Week" for level 5
- **THEN** only results achieved during the current ISO week are considered
- **AND** a player whose only completions were last week does not appear

#### Scenario: Daily view shows today's best

- **WHEN** a player selects "Today" for level 5
- **THEN** only results achieved today (UTC) are considered

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

### Requirement: Viewer's own position is indicated

When the viewing player is registered and has completed the level (within the selected time period), the leaderboard SHALL indicate their position. If the viewer is in the top 10, their row SHALL be visually highlighted. If the viewer is outside the top 10, their rank and result SHALL be shown separately below the list.

#### Scenario: Viewer is in the top 10

- **WHEN** a registered player ranked 3rd on level 5 views that leaderboard
- **THEN** their row is visually distinct from the other rows

#### Scenario: Viewer is outside the top 10

- **WHEN** a registered player ranked 42nd on level 5 views that leaderboard
- **THEN** their rank, stars, moves, and time are shown below the top 10

#### Scenario: Viewer has not completed the level

- **WHEN** a registered player who has not completed level 5 views its leaderboard
- **THEN** no viewer position is shown

#### Scenario: Viewer has no result in the selected period

- **WHEN** a registered player who completed level 5 last week views the "Today" leaderboard
- **THEN** no viewer position is shown for that period

### Requirement: Completion history is preserved

Every level completion SHALL be recorded as a distinct event preserving the full attempt detail: moves, hints used, undos used, whether the level was restarted, star rating, elapsed time, and timestamp.

These events SHALL be retained indefinitely and SHALL be reprocessable to produce leaderboard views for any time window.

A player improving their best result SHALL NOT discard the record of previous attempts.

#### Scenario: Multiple attempts are preserved

- **WHEN** a player completes level 5 three times with 1, 2, and 3 stars
- **THEN** all three completions are recorded with their full detail

#### Scenario: Attempt detail includes hints and undos

- **WHEN** a player completes a level using 2 hints and 3 undos
- **THEN** the recorded event includes hints: 2 and undos: 3

### Requirement: Leaderboard is accessible from the game screen

After completing a level, the player SHALL be able to view that level's leaderboard without navigating away from the gameplay flow.

#### Scenario: Accessible after completion

- **WHEN** a player completes level 12
- **THEN** they can view the level 12 leaderboard from the win screen or game screen

### Requirement: Leaderboard is accessible from level select

The level-select screen SHALL provide access to the per-level leaderboard for any accessible (non-locked) level. Selecting a level SHALL display its leaderboard in a detail panel alongside the level grid.

Locked levels SHALL NOT be selectable and SHALL NOT show a leaderboard.

#### Scenario: Viewing from level select for a completed level

- **WHEN** a player has completed level 8 and selects it on the level-select screen
- **THEN** they can view the level 8 leaderboard

#### Scenario: Viewing from level select for an uncompleted but accessible level

- **WHEN** a player has not completed level 10 but it is unlocked
- **THEN** they can select level 10 and view its leaderboard

#### Scenario: Locked levels are not selectable

- **WHEN** a player has not unlocked level 20
- **THEN** level 20 cannot be selected and no leaderboard is shown for it

### Requirement: Leaderboard updates when a better result is recorded

When a player improves their best result on a level, the leaderboard for that level SHALL reflect the new result. The update does not need to be instant but SHALL be reflected the next time the leaderboard is fetched.

#### Scenario: Improved result updates the board

- **WHEN** player A improves from 2 stars to 3 stars on level 5
- **THEN** the next fetch of the level 5 leaderboard reflects the 3-star result
