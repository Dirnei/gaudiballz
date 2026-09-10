## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Points awarded per star rating

Each star rating SHALL map to a fixed XP value. The mapping SHALL be:

- 1 star → 100 XP
- 2 stars → 250 XP
- 3 stars → 500 XP

#### Scenario: 3-star XP award

- **WHEN** a player earns 3 stars on a level
- **THEN** 500 XP is awarded for that level

#### Scenario: 1-star XP award

- **WHEN** a player earns 1 star on a level
- **THEN** 100 XP is awarded for that level

### Requirement: Total points

The player's total XP SHALL be the sum of the best XP award across all completed levels, plus all accumulated bonus XP (no-hint, first-clear, streak-day, replay, and time-beat bonuses).

#### Scenario: Total across multiple levels with bonuses

- **WHEN** a player has completed 3 levels with best ratings of 3, 2, and 1 stars, earned 2 first-clear bonuses (150 XP), and 1 no-hint bonus (50 XP)
- **THEN** their total XP is 500 + 250 + 100 + 150 + 50 = 1,050

### Requirement: Win screen shows star rating

The win screen SHALL display the star rating earned for the just-completed attempt and the XP awarded.

If the attempt improved the player's best star rating for the level, the win screen SHALL indicate the improvement.

If the attempt did not improve the best rating, the win screen SHALL show the attempt's rating alongside the existing best.

The win screen SHALL itemise bonus XP earned (no-hint bonus, first-clear bonus, streak bonus, replay bonus, time-beat bonus) as separate line items.

#### Scenario: First completion with bonuses

- **WHEN** a player completes a level for the first time with 3 stars and no hints
- **THEN** the win screen shows 3 stars, 500 XP, +75 XP first-clear bonus, and +50 XP no-hint bonus

#### Scenario: Improved rating on replay

- **WHEN** a player replays a level and earns 3 stars where they had 2
- **THEN** the win screen shows 3 stars, indicates a new best, and lists applicable bonuses

#### Scenario: No improvement on replay

- **WHEN** a player replays a level and earns 1 star where they had 3
- **THEN** the win screen shows 1 star for this attempt, indicates the best is still 3 stars, and lists any replay bonus
