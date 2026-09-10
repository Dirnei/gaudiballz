## MODIFIED Requirements

### Requirement: The system records notable player events

The system SHALL record events when a registered player performs a notable action. Notable actions SHALL include: completing a level, setting a new personal best on a level, earning an achievement, climbing in the leaderboard ranking, and completing the daily challenge.

Each recorded event SHALL include a structured payload with the action kind and its parameters (level number, move count, achievement identifier, rank position, daily challenge date, etc.) so that the client can format a locale-appropriate display string. The server SHALL NOT store pre-formatted human-readable text for new events.

Anonymous player actions SHALL NOT appear in the feed.

#### Scenario: Level completion recorded

- **WHEN** a registered player completes level 45 in 19 moves
- **THEN** an event is recorded with the player name, action kind `level-cleared`, and parameters `{ level: 45, moves: 19 }`

#### Scenario: Achievement earned recorded with identifier

- **WHEN** a registered player earns the "First Steps" achievement
- **THEN** an event is recorded with action kind `achievement-earned` and parameters `{ achievementId: "first-steps" }`

#### Scenario: Daily challenge completion recorded

- **WHEN** a registered player completes the daily challenge on 2026-09-15 in 18 moves with 3 stars
- **THEN** an event is recorded with action kind `daily-completed` and parameters `{ date: "2026-09-15", moves: 18, stars: 3 }`

#### Scenario: Anonymous actions excluded

- **WHEN** an anonymous player completes a level
- **THEN** no event is recorded in the activity feed
