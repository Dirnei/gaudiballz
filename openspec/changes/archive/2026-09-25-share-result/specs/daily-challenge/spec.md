# Spec Delta

## ADDED Requirements

### Requirement: Share daily result

The daily challenge solved overlay SHALL offer a Share result action that copies a short text
summary of the attempt just solved to the clipboard, then briefly confirms that it was copied.
It SHALL NOT open a system share sheet. The text SHALL contain, in the player's language:

- the game name and the challenge date,
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

#### Scenario: Share text for a 3-star daily result

- **WHEN** a player solves the Sep 25 daily challenge in 18 moves with par 20, in 42.3 seconds
  with a time target of 90 seconds and no hints, and shares the result in English
- **THEN** the clipboard holds:
  ```
  I played Gaudi Ballz / Daily Sep 25

  ⭐️⭐️⭐️ 18/20 moves | ⏱️ 42.3s/90.0s

  Check out on <site origin>/r/<result id>
  ```
- **AND** the overlay briefly confirms it was copied

#### Scenario: Share text shows missed stars and hints

- **WHEN** a player solves the daily challenge with 1 star in 22 moves and used 2 hints
- **THEN** the star line shows one filled and two empty stars
- **AND** the text states that 2 hints were used

#### Scenario: No hints means no hint mention

- **WHEN** a player solves the daily challenge without using hints and shares the result
- **THEN** the text does not mention hints

#### Scenario: Anonymous player can share

- **WHEN** an anonymous player solves the daily challenge
- **THEN** the Share result action is offered
