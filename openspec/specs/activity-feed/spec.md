# activity-feed Specification

## Purpose
Shows a stream of recent notable player actions on the home page so the game feels alive and gives players awareness of what the community is doing.

## Requirements

### Requirement: The system records notable player events

The system SHALL record events when a registered player performs a notable action. Notable actions SHALL include: completing a level, setting a new personal best on a level, earning an achievement, and climbing in the leaderboard ranking.

Anonymous player actions SHALL NOT appear in the feed.

#### Scenario: Level completion recorded

- **WHEN** a registered player completes level 45 in 19 moves
- **THEN** an event is recorded with the player name, action type, level number, and move count

#### Scenario: Anonymous actions excluded

- **WHEN** an anonymous player completes a level
- **THEN** no event is recorded in the activity feed

### Requirement: The activity feed returns recent events

The system SHALL provide an endpoint that returns the most recent notable events in reverse chronological order. The response SHALL include the player name, action description, and relative timestamp for each event.

The feed SHALL be limited to a reasonable number of recent events (not unbounded).

#### Scenario: Fetching the activity feed

- **WHEN** the client requests the activity feed
- **THEN** it receives the most recent notable events, each with player name, action, and timestamp

### Requirement: Activity feed is visible on the home page

The home page SHALL display the activity feed. It SHALL load when the home page is visited and SHALL be visible to all players, including anonymous ones.

#### Scenario: Anonymous player sees the feed

- **WHEN** an anonymous player visits the home page
- **THEN** the activity feed is visible showing recent community activity

#### Scenario: Feed shows a variety of event types

- **WHEN** the activity feed has recent events of different types
- **THEN** level completions, new records, achievements, and rank changes are all represented

### Requirement: Activity feed events expire

Events in the activity feed SHALL have a limited retention period. Events older than the retention period SHALL no longer be returned by the feed endpoint.

#### Scenario: Old events drop off

- **WHEN** an event is older than the retention period
- **THEN** it no longer appears in the activity feed response

### Requirement: Activity feed does not reveal private information

The activity feed SHALL show only the player's public username and the nature of the action. It SHALL NOT reveal a player's total points, win rate, or other aggregate statistics in the feed entry.

#### Scenario: Feed entry content

- **WHEN** a player sets a new record on level 38
- **THEN** the feed entry shows the player's name and that they set a record on level 38
- **AND** it does not include their total points or win rate
