## ADDED Requirements

### Requirement: Completion events carry attempt metadata

When a completion is recorded, the system SHALL accept and persist additional metadata
about the attempt alongside the existing moves and hints:

- Whether any undos were used during the attempt (undo count).
- Whether the level was restarted before completing it in the current session.
- A client-side session identifier that groups completions made during a single page
  lifecycle (from load to unload).

This metadata SHALL be available to downstream consumers (such as achievement evaluation)
without changing the existing best-result recording behaviour. The best moves and best
hints logic SHALL remain unchanged.

#### Scenario: Metadata is accepted alongside a completion

- **WHEN** a player completes a level and the client sends moves, hints, undo count,
  restarted flag, and session id
- **THEN** the completion is recorded as before and the metadata is available for
  downstream processing

#### Scenario: Existing completions without metadata are unaffected

- **WHEN** a completion recorded before this change is loaded
- **THEN** it is treated normally with absent metadata defaulting to unknown

### Requirement: Completion recording notifies achievement evaluation

After a completion is successfully persisted, the system SHALL notify the achievement
evaluation subsystem with the player id, level, result, and attempt metadata.

This notification SHALL NOT block or delay the completion response to the client. A
failure in achievement evaluation SHALL NOT cause the completion to fail.

#### Scenario: Achievement evaluation is notified

- **WHEN** a completion is persisted for a registered player
- **THEN** the achievement subsystem is notified with the completion details

#### Scenario: Achievement failure does not affect completion

- **WHEN** the achievement subsystem fails to process a notification
- **THEN** the completion remains recorded and the response to the client is unaffected
