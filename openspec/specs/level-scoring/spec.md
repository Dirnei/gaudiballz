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

Each star rating SHALL map to a fixed XP value. The mapping SHALL be:

- 1 star → 100 XP
- 2 stars → 250 XP
- 3 stars → 500 XP

#### Scenario: 3-star point award

- **WHEN** a player earns 3 stars on a level
- **THEN** 500 XP is awarded for that level

#### Scenario: 1-star point award

- **WHEN** a player earns 1 star on a level
- **THEN** 100 XP is awarded for that level

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

The player's total XP SHALL be the sum of the best XP award across all completed levels, plus all accumulated bonus XP (no-hint, first-clear, streak-day, replay, and time-beat bonuses).

#### Scenario: Total across multiple levels

- **WHEN** a player has completed 3 levels with best ratings of 3, 2, and 1 stars, earned 2 first-clear bonuses (150 XP), and 1 no-hint bonus (50 XP)
- **THEN** their total XP is 500 + 250 + 100 + 150 + 50 = 1,050

#### Scenario: Improving a level increases total

- **WHEN** a player improves level 5 from 1 star (100 XP) to 3 stars (500 XP)
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

The win screen SHALL display the star rating earned for the just-completed attempt and the XP awarded.

If the attempt improved the player's best star rating for the level, the win screen SHALL indicate the improvement.

If the attempt did not improve the best rating, the win screen SHALL show the attempt's rating alongside the existing best.

The win screen SHALL itemise bonus XP earned (no-hint bonus, first-clear bonus, streak bonus, replay bonus, time-beat bonus) as separate line items.

#### Scenario: First completion

- **WHEN** a player completes a level for the first time with 3 stars and no hints
- **THEN** the win screen shows 3 stars, 500 XP, +75 XP first-clear bonus, and +50 XP no-hint bonus

#### Scenario: Improved rating on replay

- **WHEN** a player replays a level and earns 3 stars where they had 2
- **THEN** the win screen shows 3 stars, indicates a new best, and lists applicable bonuses

#### Scenario: No improvement on replay

- **WHEN** a player replays a level and earns 1 star where they had 3
- **THEN** the win screen shows 1 star for this attempt, indicates the best is still 3 stars, and lists any replay bonus

### Requirement: Stars are for all players

Star ratings and points SHALL work for both anonymous and registered players. No account is required to earn or view stars.

#### Scenario: Anonymous player earns stars

- **WHEN** an anonymous player completes a level under par with no hints
- **THEN** stars are awarded and displayed on the win screen and level-select tile

### Requirement: No-hint bonus XP

When a player completes a level without using any hints during the attempt, the system SHALL award a 50 XP bonus in addition to the star-based points.

The no-hint bonus SHALL be awarded on every qualifying completion, including replays.

#### Scenario: Completing without hints earns bonus

- **WHEN** a player completes a level using 0 hints
- **THEN** 50 bonus XP is awarded alongside the star-based points

#### Scenario: Using a hint forfeits the bonus

- **WHEN** a player completes a level having used 1 or more hints
- **THEN** no no-hint bonus is awarded

### Requirement: First-clear bonus XP

The first time a player completes a given level, the system SHALL award a 75 XP bonus in addition to the star-based points and any other bonuses.

Replaying an already-completed level SHALL NOT earn the first-clear bonus again.

#### Scenario: First completion earns first-clear bonus

- **WHEN** a player completes level 15 for the first time
- **THEN** 75 bonus XP is awarded alongside other points and bonuses

#### Scenario: Replay does not earn first-clear bonus

- **WHEN** a player replays level 15 which they have already completed
- **THEN** no first-clear bonus is awarded

### Requirement: Streak-day bonus XP

When a player completes at least one level on a calendar day (UTC) that extends their current day streak, the system SHALL award a 25 XP bonus once for that day.

The bonus SHALL be awarded at most once per calendar day, regardless of how many levels are completed.

#### Scenario: Extending a streak earns the bonus

- **WHEN** a player who played yesterday completes a level today (extending their streak)
- **THEN** 25 XP streak bonus is awarded

#### Scenario: Starting a new streak earns the bonus

- **WHEN** a player who last played 3 days ago completes a level today (starting a new streak of 1)
- **THEN** 25 XP streak bonus is awarded

#### Scenario: Second completion on the same day earns no additional streak bonus

- **WHEN** a player completes a second level on the same UTC day
- **THEN** no additional streak bonus is awarded

### Requirement: Replay bonus is limited to once per level per day

The existing replay bonus (awarded when replaying an already-completed level) SHALL be awarded at most once per level per calendar day (UTC).

Replaying the same level multiple times on the same day SHALL award the replay bonus only on the first replay.

#### Scenario: First replay of the day earns the bonus

- **WHEN** a player replays level 5 for the first time today
- **THEN** the replay bonus is awarded

#### Scenario: Second replay of the same level today earns nothing

- **WHEN** a player replays level 5 a second time on the same UTC day
- **THEN** no replay bonus is awarded

#### Scenario: Replaying the same level the next day earns the bonus again

- **WHEN** a player replays level 5 on the next UTC day
- **THEN** the replay bonus is awarded

### Requirement: Win screen explains missed stars

When a completion earns fewer than 3 stars, the win screen SHALL list every condition the attempt
missed for a 3-star rating, one line each:

- **Hints used**: the attempt used one or more hints, which caps the rating at 1 star.
- **Moves over par**: the attempt used more moves than par, stating how many moves over par.
- **Time over target**: the elapsed time was over the time target, stating by how much in
  seconds with one decimal. The amount SHALL be rounded up, so it is never shown as 0.0 seconds.

Every missed condition SHALL be listed, not only the one that decided the rating. For example,
an attempt that is both over par and over the time target lists both.

When the completion earns 3 stars, no explanation SHALL be shown.

The explanation SHALL appear on the campaign win screen and on the daily challenge solved
overlay. It SHALL be available in every supported language.

#### Scenario: Over par

- **WHEN** a player completes a level with par 12 in 14 moves, within the time target and with no
  hints
- **THEN** the win screen shows 1 star and explains the attempt was 2 moves over par
- **AND** shows no line about time or hints

#### Scenario: Under par but slow

- **WHEN** a player completes a level with par 12 in 11 moves and 34.2 seconds, the time target
  is 30 seconds, and no hints were used
- **THEN** the win screen shows 2 stars and explains the attempt was 4.2 seconds over the time
  target

#### Scenario: Over par and slow lists both

- **WHEN** a player completes a level with par 12 in 15 moves and 40 seconds, the time target is
  30 seconds, and no hints were used
- **THEN** the win screen explains both that the attempt was 3 moves over par and 10.0 seconds
  over the time target

#### Scenario: Hint used

- **WHEN** a player completes a level under par and within the time target but used 1 hint
- **THEN** the win screen shows 1 star and explains that using a hint caps the rating at 1 star

#### Scenario: Barely over the target is not shown as zero

- **WHEN** a player completes a level under par with no hints, 30.01 seconds elapsed and a time
  target of 30 seconds
- **THEN** the win screen explains the attempt was 0.1 seconds over the time target

#### Scenario: Three stars shows no explanation

- **WHEN** a player completes a level at par, within the time target and with no hints
- **THEN** the win screen shows 3 stars and no missed-star explanation

#### Scenario: Daily challenge explains missed stars

- **WHEN** a player solves the daily challenge 2 moves over par
- **THEN** the daily solved overlay explains the attempt was 2 moves over par

### Requirement: Share level result

The campaign win screen SHALL offer a Share result action that copies a short text summary of
the attempt just completed to the clipboard, then briefly confirms that it was copied. It SHALL
NOT open a system share sheet. The text SHALL contain, in the player's language:

- the game name and the level number,
- the stars earned, as three star symbols with the unearned ones shown empty,
- the move count and the par,
- the elapsed time and the time target, in seconds with one decimal,
- the number of hints used, only when at least one hint was used,
- a link to the result page for this attempt.

The text SHALL NOT contain any information about the board (colours, tube contents or moves
played), and SHALL NOT contain the player's name, id or profile ball.

The text SHALL be three lines separated by blank lines: a title line, a score line with the
stars, moves, time and (when used) hints separated by ` | `, and a line inviting the reader to
the link.

Share SHALL be available to anonymous and registered players alike.

#### Scenario: Share text for a level result

- **WHEN** a player completes level 26 with 2 stars in 28 moves with par 30, in
  95.0 seconds with a time target of 90 seconds and no hints, and shares the result in English
- **THEN** the clipboard holds:
  ```
  I played Gaudi Ballz / Level 26

  ⭐️⭐️☆ 28/30 moves | ⏱️ 95.0s/90.0s

  Check out on <site origin>/r/<result id>
  ```
- **AND** the win screen briefly confirms it was copied

#### Scenario: Hints are stated when used

- **WHEN** a player completes a level having used 1 hint and shares the result
- **THEN** the text states that 1 hint was used

#### Scenario: Anonymous player can share a level

- **WHEN** an anonymous player completes a level
- **THEN** the Share result action is offered on the win screen
