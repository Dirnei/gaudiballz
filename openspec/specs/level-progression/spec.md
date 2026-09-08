# level-progression Specification

## Purpose
Keeps track of what a player has completed and how well, so that progress belongs to the
player rather than to the browser they happened to be using, and survives being opened
somewhere else.

## Requirements

### Requirement: Completed levels are recorded

When a player completes a level, the system SHALL record that it was completed, along with
the number of moves taken and the number of hints used in that attempt.

A completion SHALL be recorded against the player's identity, not the browser.

Recording SHALL be idempotent: submitting the same completion more than once SHALL leave the
record as though it had been submitted once.

#### Scenario: A completion is kept

- **WHEN** a player completes a level
- **THEN** the level is recorded as completed for that player
- **AND** the moves taken and hints used are recorded with it

#### Scenario: Submitting twice changes nothing

- **WHEN** the same completion is submitted again
- **THEN** the player's record is the same as after the first submission

### Requirement: Progress survives the browser

A player's progress SHALL be retrievable from their identity, so that clearing browser
storage does not lose it as long as the player can sign in.

When a player signs in on a device with no local progress, the progress on the account
SHALL be used.

#### Scenario: Cleared storage, signed in

- **WHEN** a player with a passkey clears their browser and signs in again
- **THEN** their completed levels are still available

#### Scenario: A fresh device shows account progress

- **WHEN** a player signs in on a device that has never played
- **THEN** the levels completed on the account are available there

### Requirement: The best attempt is kept

Where a level has been completed more than once, the system SHALL keep the fewest moves and
the fewest hints achieved for it, rather than the most recent attempt.

A later, worse attempt SHALL NOT replace a better recorded one.

#### Scenario: A better attempt replaces the record

- **WHEN** a player completes a level in fewer moves than before
- **THEN** the recorded best is the lower number

#### Scenario: A worse attempt does not

- **WHEN** a player completes a level in more moves than their recorded best
- **THEN** the recorded best is unchanged

### Requirement: Merging two devices

When progress exists both on the account and on the device signing in, the system SHALL
merge them rather than discarding either.

Merging SHALL be performed per level, keeping the better result for each, so that playing
on two devices never costs a player work they have already done.

#### Scenario: Neither side is lost

- **WHEN** a device has completed levels the account has not, and the account has completed
  levels the device has not
- **THEN** after signing in, both sets are present

#### Scenario: The better result wins per level

- **WHEN** both sides have completed the same level with different move counts
- **THEN** the lower move count is kept

### Requirement: Progress made offline is not lost

A player SHALL be able to complete levels with no network connection, and those completions
SHALL be recorded once a connection returns.

Completions waiting to be sent SHALL survive the game being closed and reopened.

The interface SHALL NOT block play, or report failure, because a completion has not yet been
sent.

#### Scenario: Playing without a connection

- **WHEN** a player completes a level with no network
- **THEN** the completion is kept locally
- **AND** play continues as normal

#### Scenario: Queued completions are sent later

- **WHEN** the connection returns
- **THEN** the completions made offline are recorded on the account

#### Scenario: Closing the game does not discard queued work

- **WHEN** a player completes a level offline and closes the game before reconnecting
- **THEN** the completion is still sent the next time the game runs with a connection

### Requirement: Level gating

Players SHALL only be able to access levels up to their level ceiling. The level ceiling
SHALL be the maximum of:

1. The highest completed level + 1 (from server-side progress),
2. Any locally stored level reached (from localStorage), and
3. Any code-based unlock level.

Attempting to navigate beyond the ceiling SHALL be prevented — the navigation control
SHALL be disabled or hidden when the player is at the ceiling. This applies both to the sequential next/previous controls on the gameplay screen and to the level tiles on the level selection screen.

Advancing to the next level after completing one SHALL be allowed as long as the new
level is within the ceiling.

#### Scenario: A new player can only play level 1

- **WHEN** a player has no progress and no code-based unlock
- **THEN** they can access level 1 only
- **AND** the next-level control is disabled

#### Scenario: Completing a level raises the ceiling

- **WHEN** a player completes level 5
- **THEN** they can access levels 1 through 6

#### Scenario: The next button is disabled at the ceiling

- **WHEN** a player is on their highest accessible level and has not completed it
- **THEN** the next-level control is disabled

#### Scenario: A code-based unlock raises the ceiling

- **WHEN** a player has completed up to level 10 and enters a code for level 30
- **THEN** they can access levels 1 through 30

#### Scenario: Previous levels remain accessible

- **WHEN** a player's ceiling is level 50
- **THEN** they can navigate back to any level from 1 to 50

#### Scenario: Existing progress is preserved

- **WHEN** a player whose server-side highest completed level is 96 loads the game after gating is introduced
- **THEN** their ceiling is at least 97
- **AND** no progress is lost

#### Scenario: Level select grid respects the ceiling

- **WHEN** a player with a ceiling of 31 opens the level selection screen
- **THEN** levels 1 through 31 are tappable
- **AND** levels 32 and above appear locked and are not tappable

### Requirement: Per-level progress is available to the client

The client SHALL be able to retrieve the player's per-level completion data (which levels are completed and the best result for each) so that the level selection screen can display progress state.

#### Scenario: Progress data includes all completed levels

- **WHEN** a player who has completed levels 1 through 10 requests their progress
- **THEN** the response includes an entry for each of those 10 levels with the best moves and hints

#### Scenario: Progress data is available to unauthenticated players

- **WHEN** an anonymous player who has completed levels requests their progress
- **THEN** the per-level data is returned for their anonymous identity

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
