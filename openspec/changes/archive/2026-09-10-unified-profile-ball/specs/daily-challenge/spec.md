## MODIFIED Requirements

### Requirement: Daily leaderboard

The system SHALL maintain a leaderboard for each day's challenge, ranked by stars (descending), then moves (ascending), then elapsed time (ascending). The daily leaderboard SHALL be available to all players after they have submitted at least one attempt.

Each daily leaderboard entry SHALL include the player's profile ball colour so the client can render it consistently with the rest of the game.

Only registered players SHALL appear on the daily leaderboard. Anonymous players can see the leaderboard after playing but their results are not listed.

#### Scenario: Leaderboard ranks by stars then moves

- **WHEN** player A has 3 stars in 14 moves and player B has 3 stars in 16 moves
- **THEN** player A ranks above player B on the daily leaderboard

#### Scenario: Anonymous player sees but is not listed

- **WHEN** an anonymous player completes the daily challenge and views the leaderboard
- **THEN** the leaderboard is visible but the anonymous player's result does not appear in it

#### Scenario: Daily entries show profile ball

- **WHEN** a player who chose a green ball appears on the daily leaderboard
- **THEN** their entry shows a green ball
