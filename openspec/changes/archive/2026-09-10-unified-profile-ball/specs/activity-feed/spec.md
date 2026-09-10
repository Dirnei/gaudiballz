## MODIFIED Requirements

### Requirement: The activity feed returns recent events

The system SHALL provide an endpoint that returns the most recent notable events in reverse chronological order. Each event SHALL include the player name, the player's profile ball colour, action kind, structured parameters, and timestamp.

The feed SHALL be limited to a reasonable number of recent events (not unbounded).

Legacy events that were stored as pre-formatted text SHALL be returned with action kind `legacy` and the original text in a `text` parameter, so the client can render them as-is.

#### Scenario: Fetching the activity feed

- **WHEN** the client requests the activity feed
- **THEN** it receives the most recent events, each with player name, profile ball, action kind, parameters, and timestamp

#### Scenario: Legacy event returned as-is

- **WHEN** the feed contains an event stored before the structured format was introduced
- **THEN** it is returned with action kind `legacy` and a `text` parameter containing the original English string
