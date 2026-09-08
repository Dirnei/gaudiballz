# level-scoring Specification

## Purpose

Rates each level completion with 1–3 stars based on move efficiency and speed, assigns point values that accumulate into a player total, and displays the rating on the win screen and level-select grid.

## Requirements

### Requirement: Star rating for level completions

Every level completion SHALL earn a star rating from 1 to 3 based on the player's moves and elapsed time compared to the level's par and time target:

- **3 stars**: moves ≤ par AND elapsed time ≤ time target.
- **2 stars**: moves ≤ par AND elapsed time > time target.
- **1 star**: moves > par.

Par is the number of moves in the level's known constructive solution.

#### Scenario: Under par and fast earns 3 stars

- **WHEN** a player completes a level with par 12 in 10 moves and 25 seconds, and the time target is 30 seconds
- **THEN** the completion earns 3 stars

#### Scenario: Under par but slow earns 2 stars

- **WHEN** a player completes a level with par 12 in 10 moves and 45 seconds, and the time target is 30 seconds
- **THEN** the completion earns 2 stars

#### Scenario: Exactly at par and at time target earns 3 stars

- **WHEN** a player completes a level with par 12 in exactly 12 moves and exactly the time target
- **THEN** the completion earns 3 stars

#### Scenario: Over par earns 1 star

- **WHEN** a player completes a level with par 12 in 15 moves
- **THEN** the completion earns 1 star regardless of elapsed time

### Requirement: Hints cap the rating at 1 star

If the player used any hints during the attempt, the star rating SHALL be 1 regardless of moves or elapsed time.

#### Scenario: Under par with a hint

- **WHEN** a player completes a level with par 12 in 8 moves and used 1 hint
- **THEN** the completion earns 1 star

#### Scenario: No hints allows full rating

- **WHEN** a player completes a level under par with no hints used
- **THEN** the star rating is determined by moves and time normally

### Requirement: Points awarded per star rating

Each star rating SHALL map to a fixed point value. The mapping SHALL be:

- 1 star → 100 points
- 2 stars → 250 points
- 3 stars → 500 points

#### Scenario: 3-star point award

- **WHEN** a player earns 3 stars on a level
- **THEN** 500 points are awarded for that level

#### Scenario: 1-star point award

- **WHEN** a player earns 1 star on a level
- **THEN** 100 points are awarded for that level

### Requirement: Best star result per level

The system SHALL keep the highest star rating ever achieved on each level, not the most recent.

A later attempt with fewer stars SHALL NOT replace a better rating. The point value stored for the level SHALL correspond to the highest star rating achieved.

#### Scenario: Improving from 2 to 3 stars

- **WHEN** a player earns 3 stars on a level where they previously had 2 stars
- **THEN** the best rating becomes 3 stars and the level's points become 500

#### Scenario: A worse attempt does not replace

- **WHEN** a player earns 1 star on a level where they had 3 stars
- **THEN** the best rating remains 3 stars and points remain 500

### Requirement: Total points

The player's total points SHALL be the sum of the best point award across all completed levels.

#### Scenario: Total across multiple levels

- **WHEN** a player has completed 3 levels with best ratings of 3, 2, and 1 stars
- **THEN** their total points are 500 + 250 + 100 = 850

#### Scenario: Improving a level increases total

- **WHEN** a player improves level 5 from 1 star (100 pts) to 3 stars (500 pts)
- **THEN** their total increases by 400

### Requirement: Elapsed time tracking

The client SHALL measure elapsed time for each attempt. The timer SHALL start when the player makes the first move and SHALL stop when the solving move is made.

Time SHALL NOT advance while the browser tab is hidden or the app is backgrounded.

Time SHALL NOT advance while a modal overlay is displayed (restart confirmation, stuck notice).

A restart SHALL reset the timer to zero.

#### Scenario: Thinking time before first move is free

- **WHEN** a player loads a level, waits 60 seconds, then makes the first move
- **THEN** elapsed time starts at zero from the first move

#### Scenario: Timer pauses when tab is hidden

- **WHEN** a player hides the browser tab for 2 minutes mid-attempt
- **THEN** those 2 minutes are not counted in elapsed time

#### Scenario: Timer pauses during restart confirmation

- **WHEN** a player opens the restart confirmation dialog for 10 seconds
- **THEN** those 10 seconds are not counted in elapsed time

#### Scenario: Timer resets on restart

- **WHEN** a player restarts the level
- **THEN** elapsed time resets to zero

#### Scenario: Timer stops on completion

- **WHEN** the player makes the solving move
- **THEN** elapsed time stops and the final value is the attempt's elapsed time

### Requirement: Time target per level

Each level SHALL have a time target that reflects its difficulty. Levels with more colours or more tubes SHALL have higher time targets than simpler levels.

The time target for a level SHALL be available to the client alongside the level's par.

#### Scenario: Easy level has a lower time target

- **WHEN** comparing a 3-colour level to a 10-colour level
- **THEN** the 3-colour level has a lower time target

#### Scenario: Time target is served with the level

- **WHEN** a player loads a level
- **THEN** the level's par and time target are both available

### Requirement: Win screen shows star rating

The win screen SHALL display the star rating earned for the just-completed attempt and the points awarded.

If the attempt improved the player's best star rating for the level, the win screen SHALL indicate the improvement.

If the attempt did not improve the best rating, the win screen SHALL show the attempt's rating alongside the existing best.

#### Scenario: First completion

- **WHEN** a player completes a level for the first time and earns 2 stars
- **THEN** the win screen shows 2 stars and 250 points

#### Scenario: Improved rating on replay

- **WHEN** a player replays a level and earns 3 stars where they had 2
- **THEN** the win screen shows 3 stars and indicates a new best

#### Scenario: No improvement on replay

- **WHEN** a player replays a level and earns 1 star where they had 3
- **THEN** the win screen shows 1 star for this attempt and indicates the best is still 3 stars

### Requirement: Stars are for all players

Star ratings and points SHALL work for both anonymous and registered players. No account is required to earn or view stars.

#### Scenario: Anonymous player earns stars

- **WHEN** an anonymous player completes a level under par with no hints
- **THEN** stars are awarded and displayed on the win screen and level-select tile
