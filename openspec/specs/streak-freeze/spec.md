# streak-freeze Specification

## Purpose
Lets a player keep their day streak through the occasional missed day by earning streak freezes through steady play. Freezes are held in a small capped pool and spent automatically.

## Requirements

### Requirement: Streak freezes are earned by playing

A player SHALL earn one streak freeze each time their current day streak reaches a multiple of 7
played days (7, 14, 21, …). Only calendar days (UTC) with at least one completed level, campaign
or daily challenge, SHALL count toward this. Days covered by a freeze SHALL NOT count.

A player SHALL hold at most 2 streak freezes. A freeze earned while the player already holds 2
SHALL be lost, not banked.

A freeze SHALL be earned at most once per streak length. Completing several levels on the day
the streak reaches 7 SHALL award one freeze.

#### Scenario: Seventh played day earns a freeze

- **WHEN** a player holding no freezes completes a level on the 7th consecutive day of their streak
- **THEN** they hold 1 streak freeze

#### Scenario: Fourteenth played day earns a second freeze

- **WHEN** a player holding 1 freeze reaches a 14-day streak
- **THEN** they hold 2 streak freezes

#### Scenario: Freeze earned at the cap is lost

- **WHEN** a player holding 2 freezes reaches a 21-day streak
- **THEN** they still hold 2 streak freezes

#### Scenario: Several completions on the seventh day earn one freeze

- **WHEN** a player completes 4 levels on the day their streak reaches 7
- **THEN** they hold exactly 1 more freeze than before that day

#### Scenario: A frozen day does not count toward the next freeze

- **WHEN** a player's streak is 6, one missed day is covered by a freeze, and they then play the next day
- **THEN** their streak is 7 and they earn a freeze on that day

### Requirement: Held freezes cover missed days automatically

When a player has missed one or more calendar days (UTC) since their last played or frozen day,
and the number of missed days is no more than the freezes they hold, those days SHALL be covered:
one freeze per missed day, without any action from the player. The current day SHALL NOT count as
missed until it has ended.

While missed days are covered, the freeze count shown to the player SHALL already be reduced by
the number of covered days. The freezes SHALL be spent for good once the player next completes a
level.

When the number of missed days exceeds the freezes held, the streak SHALL break as it would
without freezes, and no freezes SHALL be spent. The player keeps every freeze they held.

#### Scenario: One missed day covered

- **WHEN** a player with a 10-day streak and 1 freeze misses a day and completes a level the day after
- **THEN** their streak is 11
- **AND** they hold 0 freezes

#### Scenario: Two missed days covered

- **WHEN** a player with a 10-day streak and 2 freezes misses two days in a row and then completes a level
- **THEN** their streak is 11
- **AND** they hold 0 freezes

#### Scenario: Gap longer than freezes held

- **WHEN** a player with a 10-day streak and 1 freeze misses two days in a row and then completes a level
- **THEN** their streak is 1
- **AND** they still hold 1 freeze

#### Scenario: Covered streak is shown before the player plays again

- **WHEN** a player with a 10-day streak and 2 freezes missed yesterday and opens the game today without completing a level yet
- **THEN** their current streak is shown as 10
- **AND** they are shown as holding 1 freeze

#### Scenario: Today is not missed yet

- **WHEN** a player who played yesterday opens the game today before completing a level
- **THEN** no freeze is used and their held freeze count is unchanged

### Requirement: A frozen day keeps the streak but does not extend it

A day covered by a freeze SHALL keep the current streak unbroken but SHALL NOT add to its length.
The streak length SHALL be the number of played days in the unbroken run.

A frozen day SHALL NOT award the streak-day XP bonus and SHALL NOT count toward the full-week
achievement, since no level was completed on it.

The best streak SHALL be measured the same way, so a run bridged by freezes counts as one run.

#### Scenario: Frozen day does not add to the streak

- **WHEN** a player with a 5-day streak has one missed day covered by a freeze
- **THEN** their streak is still 5 until they next complete a level, when it becomes 6

#### Scenario: Frozen day earns no streak bonus

- **WHEN** a day is covered by a freeze
- **THEN** no streak-day XP bonus is recorded for that day

#### Scenario: Frozen day does not complete a week

- **WHEN** a player completes levels on six days of an ISO week and the seventh is covered by a freeze
- **THEN** the full-week achievement is not awarded

#### Scenario: Best streak spans a frozen day

- **WHEN** a player played 8 days, had 1 day covered by a freeze, then played 4 more days before breaking the streak
- **THEN** their best streak is 12

### Requirement: The player is told when a freeze saves their streak

When the player's current streak is being kept alive by one or more freezes, the home page SHALL
show a brief notice saying that their streak was saved and how many freezes are left. The notice
SHALL be dismissible, and once dismissed it SHALL NOT reappear for the same gap.

No other prompt, reminder or notification about streaks or freezes SHALL be shown.

#### Scenario: Notice after a covered day

- **WHEN** a player whose missed day was covered by a freeze opens the home page
- **THEN** a notice says their streak was saved by a freeze and shows how many freezes remain

#### Scenario: Dismissed notice stays dismissed

- **WHEN** the player dismisses the notice and returns to the home page on the same day
- **THEN** the notice is not shown again

#### Scenario: No notice without a covered gap

- **WHEN** a player who played yesterday opens the home page
- **THEN** no streak-freeze notice is shown

### Requirement: Streak freezes are for all players

Streak freezes SHALL be earned, held and spent the same way for anonymous and registered players.
No account SHALL be required. A player's held freezes and frozen days SHALL survive linking an
account.

#### Scenario: Anonymous player earns a freeze

- **WHEN** an anonymous player reaches a 7-day streak
- **THEN** they hold 1 streak freeze

#### Scenario: Freezes survive account linking

- **WHEN** an anonymous player holding 2 freezes links an account
- **THEN** they still hold 2 freezes and their streak is unchanged
