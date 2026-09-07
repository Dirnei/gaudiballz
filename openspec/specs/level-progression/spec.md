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
