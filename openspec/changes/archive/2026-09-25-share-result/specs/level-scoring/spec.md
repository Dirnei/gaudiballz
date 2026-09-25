# Spec Delta

## ADDED Requirements

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
