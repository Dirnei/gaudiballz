# Spec Delta

## MODIFIED Requirements

### Requirement: Streak achievements track consecutive calendar days

The system SHALL track distinct calendar days (UTC) on which a player completes at least
one level. A "streak" is a run of consecutive calendar days on which each day either has at
least one completion or is covered by a streak freeze. The streak length is the number of days
in the run that have a completion; covered days keep the run unbroken but do not add to it.

Streak achievements SHALL be awarded when the player's current streak reaches the required
length.

A day with no completion that is not covered by a streak freeze SHALL break the streak. The
streak resets to 0 at that point; it does not resume from where it left off.

#### Scenario: A two-day streak

- **WHEN** a player completes a level on Monday and another on Tuesday (UTC)
- **THEN** they are awarded the 2-day streak achievement

#### Scenario: A broken streak

- **WHEN** a player holding no streak freezes completes levels on Monday and Tuesday, skips
  Wednesday, then completes on Thursday
- **THEN** their streak resets to 1 on Thursday and the 7-day streak is not awarded

#### Scenario: A covered day keeps the streak toward an achievement

- **WHEN** a player with a 6-day streak misses a day that is covered by a streak freeze, then
  completes a level the next day
- **THEN** their streak is 7 and they are awarded the 7-day streak achievement

#### Scenario: Multiple completions on one day count as one day

- **WHEN** a player completes 5 levels on the same calendar day (UTC)
- **THEN** that counts as 1 day toward the streak, not 5
