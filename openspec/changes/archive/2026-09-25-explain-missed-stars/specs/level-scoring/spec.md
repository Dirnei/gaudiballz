# Spec Delta

## ADDED Requirements

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
