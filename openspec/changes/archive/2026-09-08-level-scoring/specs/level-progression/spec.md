## MODIFIED Requirements

### Requirement: Completed levels are recorded

When a player completes a level, the system SHALL record that it was completed, along with the number of moves taken, the number of hints used, and the elapsed time in that attempt.

A completion SHALL be recorded against the player's identity, not the browser.

Recording SHALL be idempotent: submitting the same completion more than once SHALL leave the record as though it had been submitted once.

#### Scenario: A completion is kept

- **WHEN** a player completes a level
- **THEN** the level is recorded as completed for that player
- **AND** the moves taken, hints used, and elapsed time are recorded with it

#### Scenario: Submitting twice changes nothing

- **WHEN** the same completion is submitted again
- **THEN** the player's record is the same as after the first submission

### Requirement: The best attempt is kept

Where a level has been completed more than once, the system SHALL keep the fewest moves, the fewest hints, and the highest star rating achieved for it.

Moves and hints SHALL be the per-field minimum across all attempts. The star rating SHALL be the maximum across all attempts. The point value SHALL correspond to the highest star rating.

A later, worse attempt SHALL NOT replace a better recorded value in any field.

#### Scenario: A better attempt replaces the record

- **WHEN** a player completes a level in fewer moves than before
- **THEN** the recorded best moves is the lower number

#### Scenario: A worse attempt does not

- **WHEN** a player completes a level in more moves than their recorded best
- **THEN** the recorded best moves is unchanged

#### Scenario: Star rating tracks the best attempt

- **WHEN** a player earns 3 stars on a level where they previously had 2 stars
- **THEN** the recorded best stars is 3 and the recorded points match

#### Scenario: A worse star rating does not replace

- **WHEN** a player earns 1 star on a level where they had 3 stars
- **THEN** the recorded best stars remains 3

### Requirement: Merging two devices

When progress exists both on the account and on the device signing in, the system SHALL merge them rather than discarding either.

Merging SHALL be performed per level, keeping the better result for each: the fewest moves, the fewest hints, and the highest star rating, so that playing on two devices never costs a player work they have already done.

#### Scenario: Neither side is lost

- **WHEN** a device has completed levels the account has not, and the account has completed levels the device has not
- **THEN** after signing in, both sets are present

#### Scenario: The better result wins per level

- **WHEN** both sides have completed the same level with different move counts
- **THEN** the lower move count is kept

#### Scenario: The higher star rating wins per level

- **WHEN** the device has 3 stars on level 5 and the account has 2 stars on level 5
- **THEN** after merging, level 5 has 3 stars

### Requirement: Per-level progress is available to the client

The client SHALL be able to retrieve the player's per-level completion data (which levels are completed, the best moves, hints, stars, and points for each) so that the level selection screen and other UI can display progress state.

#### Scenario: Progress data includes all completed levels

- **WHEN** a player who has completed levels 1 through 10 requests their progress
- **THEN** the response includes an entry for each of those 10 levels with the best moves, hints, stars, and points

#### Scenario: Progress data is available to unauthenticated players

- **WHEN** an anonymous player who has completed levels requests their progress
- **THEN** the per-level data is returned for their anonymous identity

#### Scenario: Total points are available

- **WHEN** a player requests their progress
- **THEN** the total points (sum of best points across all levels) is included
