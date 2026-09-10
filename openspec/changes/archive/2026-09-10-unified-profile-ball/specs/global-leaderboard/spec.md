## MODIFIED Requirements

### Requirement: Leaderboard ranks players by total points

The system SHALL provide a leaderboard that ranks all registered players in descending order of total points. Anonymous players SHALL NOT appear on the leaderboard.

Each leaderboard entry SHALL include the player's profile ball colour so the client can render it. If the player has chosen a ball, that value SHALL be included. If not, the field SHALL be null and the client SHALL derive the colour from the username.

Players with equal total points SHALL be ordered by who reached that total first.

#### Scenario: Players ranked by points

- **WHEN** a player views the leaderboard
- **THEN** players are listed in descending order of total points
- **AND** each entry shows rank, player name, profile ball, total points, games played, and win rate

#### Scenario: Anonymous players excluded

- **WHEN** an anonymous player has 5,000 points
- **THEN** they do not appear on the leaderboard
