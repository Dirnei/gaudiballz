## Purpose
Records how each try at a level ends — cleared, restarted, or walked away from — so that a
win rate describes whether a player saw the level through, and so that throwing an attempt
away is something the player is warned about rather than something they discover afterwards.

## ADDED Requirements

### Requirement: An attempt has exactly one outcome

An attempt at a level SHALL begin when the player makes their first move on it, and SHALL end
in exactly one of three outcomes: completed, restarted, or abandoned.

Opening a level SHALL NOT begin an attempt. A player who looks at a board and leaves without
moving anything SHALL have nothing recorded, and SHALL NOT be warned on the way out, because
there is nothing to lose.

Completing the level SHALL count as a win. Restarting SHALL end the attempt as a loss.
Abandoning SHALL end the attempt as a loss.

Restarting SHALL immediately begin a new attempt at the same level, so a player who restarts
and then clears the level records one loss and one win.

An attempt SHALL be counted once and only once, regardless of how many moves, undos, or
hints it contained.

#### Scenario: Leaving a level without playing it

- **WHEN** a player opens a level, makes no move, and returns to the level select screen
- **THEN** no attempt is recorded
- **AND** they are not warned about leaving

#### Scenario: Clearing a level on the first try

- **WHEN** a player opens a level and completes it without restarting
- **THEN** one attempt is recorded with a completed outcome
- **AND** it counts as one win

#### Scenario: Restarting and then clearing

- **WHEN** a player restarts a level once and then completes it
- **THEN** two attempts are recorded
- **AND** the first counts as a loss and the second as a win

#### Scenario: Restarting repeatedly

- **WHEN** a player restarts a level three times and then completes it
- **THEN** four attempts are recorded, of which one is a win

#### Scenario: Replaying a level already cleared

- **WHEN** a player opens a level they have already completed and clears it again
- **THEN** a further attempt is recorded with a completed outcome

### Requirement: Leaving a level mid-attempt abandons it

Navigating away from an unfinished attempt SHALL end that attempt as a loss.

Before an in-app navigation away from an unfinished attempt takes effect, the system SHALL
warn the player that leaving counts as a loss, and SHALL allow them to stay instead. The
attempt SHALL be abandoned only if they confirm.

Closing or reloading the tab SHALL also abandon the attempt. The system SHALL report this on
a best-effort basis; where the browser prevents delivery, the attempt SHALL be left
unrecorded rather than recorded incorrectly.

An attempt that has already ended SHALL NOT be abandoned a second time, so leaving a level
after completing it SHALL record nothing further.

#### Scenario: Warned before navigating away

- **WHEN** a player who has moved at least once on an unfinished level navigates to the level select screen
- **THEN** they are warned that leaving counts as a loss
- **AND** the attempt is not yet ended

#### Scenario: Confirming the navigation

- **WHEN** the player confirms that warning
- **THEN** the navigation proceeds
- **AND** the attempt is recorded as abandoned

#### Scenario: Declining the navigation

- **WHEN** the player chooses to stay
- **THEN** they remain on the level with the board untouched
- **AND** no attempt is recorded

#### Scenario: Leaving after completing the level

- **WHEN** a player completes a level and then returns to the menu
- **THEN** no warning is shown
- **AND** no abandoned attempt is recorded

#### Scenario: Closing the tab mid-attempt

- **WHEN** a player closes the tab with an unfinished attempt
- **THEN** the attempt is reported as abandoned on a best-effort basis

### Requirement: Win rate is completions divided by attempts

Win rate SHALL be the number of attempts that ended in completion divided by the total
number of attempts, expressed as a percentage and rounded to the nearest whole number.

A player with no recorded attempts SHALL NOT be shown a win rate of zero, because no
attempts is not the same as no wins.

#### Scenario: Win rate from mixed outcomes

- **WHEN** a player has recorded 10 attempts of which 6 were completed
- **THEN** their win rate is 60%

#### Scenario: A player with no attempts yet

- **WHEN** a player has recorded no attempts
- **THEN** no win rate is shown for them rather than 0%

### Requirement: Counting begins when the feature ships

Attempts SHALL be counted from the point this capability is introduced. Levels completed
beforehand SHALL NOT be counted as attempts, and no attempt history SHALL be reconstructed
for them.

A player's win rate therefore describes their play since the feature shipped, not their
whole history.

#### Scenario: An established player's first attempt afterwards

- **WHEN** a player who had already cleared 40 levels completes one attempt after the
  feature ships
- **THEN** their win rate is 100%, counting that single attempt
- **AND** the 40 earlier clears are not counted as attempts
