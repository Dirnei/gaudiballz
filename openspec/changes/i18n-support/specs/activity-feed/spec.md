## MODIFIED Requirements

### Requirement: The system records notable player events

The system SHALL record events when a registered player performs a notable action. Notable actions SHALL include: completing a level, setting a new personal best on a level, earning an achievement, and climbing in the leaderboard ranking.

Each recorded event SHALL include a structured payload with the action kind and its parameters (level number, move count, achievement identifier, rank position, etc.) so that the client can format a locale-appropriate display string. The server SHALL NOT store pre-formatted human-readable text for new events.

Anonymous player actions SHALL NOT appear in the feed.

#### Scenario: Level completion recorded with structured data

- **WHEN** a registered player completes level 45 in 19 moves
- **THEN** an event is recorded with the player name, action kind `level-cleared`, and parameters `{ level: 45, moves: 19 }`

#### Scenario: Achievement earned recorded with identifier

- **WHEN** a registered player earns the "First Steps" achievement
- **THEN** an event is recorded with action kind `achievement-earned` and parameters `{ achievementId: "first-steps" }`

#### Scenario: Anonymous actions excluded

- **WHEN** an anonymous player completes a level
- **THEN** no event is recorded in the activity feed

### Requirement: The activity feed returns recent events

The system SHALL provide an endpoint that returns the most recent notable events in reverse chronological order. Each event SHALL include the player name, action kind, structured parameters, and timestamp.

The feed SHALL be limited to a reasonable number of recent events (not unbounded).

Legacy events that were stored as pre-formatted text SHALL be returned with action kind `legacy` and the original text in a `text` parameter, so the client can render them as-is.

#### Scenario: Fetching the activity feed with structured events

- **WHEN** the client requests the activity feed
- **THEN** it receives the most recent events, each with player name, action kind, parameters, and timestamp

#### Scenario: Legacy event returned as-is

- **WHEN** the feed contains an event stored before the structured format was introduced
- **THEN** it is returned with action kind `legacy` and a `text` parameter containing the original English string
