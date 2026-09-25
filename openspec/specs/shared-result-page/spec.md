# shared-result-page Specification

## Purpose

Gives every scored result its own public page, so a shared link shows a friend exactly what was
achieved, on which board, and how it compares, with a way straight into the same puzzle.

## Requirements

### Requirement: Every scored result has a result link

Whenever the server scores a campaign level completion or a daily challenge completion, it SHALL
keep that attempt's result under a result id and return the id with the completion response. The
result id SHALL be short (at most 10 characters), made of letters and digits, and hard to guess,
so that result pages cannot be found by counting through ids.

A stored result SHALL record what the server scored: the level or daily date, the move count,
hints used, stars, elapsed time, par and time target. It SHALL NOT be changed afterwards. A
result link SHALL keep working indefinitely.

A result link SHALL only ever exist for a result the server itself recorded. A client SHALL NOT
be able to create a result with numbers of its own choosing through any other route.

#### Scenario: Completion returns a result id

- **WHEN** a player completes level 26 and the server scores it
- **THEN** the completion response includes a result id

#### Scenario: Daily completion returns a result id

- **WHEN** a player completes the daily challenge
- **THEN** the completion response includes a result id

#### Scenario: Each attempt gets its own result

- **WHEN** a player completes the same level twice with different move counts
- **THEN** the two completions return different result ids, each showing its own move count

### Requirement: Result page shows the result

Opening `/r/<result id>` SHALL show a page with:

- what was solved: the level number, or the daily challenge with its date,
- the stars earned, the move count against par, the elapsed time against the time target, and
  the number of hints used when any were used,
- who solved it: the username and profile ball of a registered player, as they are at the time
  the page is viewed, or "A player" for an anonymous one.

The page SHALL be viewable by anyone, with or without an account, and SHALL NOT prompt the viewer
to sign up.

#### Scenario: Registered player's result

- **WHEN** a viewer opens the result link of a registered player "dirnei" with a green profile
  ball who completed level 26 with 2 stars in 28 moves against par 30, in 95.0 seconds against a
  target of 90 seconds, with no hints
- **THEN** the page shows dirnei with a green ball, level 26, 2 stars, 28/30 moves and
  95.0s/90.0s
- **AND** does not mention hints

#### Scenario: Anonymous player's result

- **WHEN** a viewer opens the result link of an anonymous player
- **THEN** the page shows the result attributed to "A player"

#### Scenario: A later username is shown

- **WHEN** an anonymous player shares a result, then registers as "dirnei", and a viewer opens
  the old link
- **THEN** the page shows the result attributed to dirnei

#### Scenario: Unknown result id

- **WHEN** a viewer opens `/r/<id>` for an id that does not exist
- **THEN** the page says the result could not be found and offers a way into the game

### Requirement: Result page previews the starting board

The result page SHALL show a static picture of the board the result was played on, as it was
before the first move. It SHALL NOT show any move played or the final state.

#### Scenario: Board preview for a level

- **WHEN** a viewer opens the result link for level 26
- **THEN** the page shows level 26's starting board, with the same tubes and balls the level
  starts with

### Requirement: Result page shows the leaderboard position

The result page SHALL show where the result places on that level's all-time leaderboard, or on
that day's daily leaderboard, as "#<position> of <total>". It SHALL be worked out when the page
is viewed, using the same order as the leaderboard (stars descending, then moves ascending, then
elapsed time ascending):

- position is 1 plus the number of leaderboard entries strictly better than the result,
- total is the number of leaderboard entries plus 1,
- the sharer's own leaderboard entry, if they have one, SHALL NOT be counted in either.

#### Scenario: Ranked against the level leaderboard

- **WHEN** level 26's leaderboard has 5 other players, 2 of them with better results
- **THEN** the result page shows "#3 of 6"

#### Scenario: The sharer's own best is not counted against them

- **WHEN** a player's best on level 26 is 3 stars and they share an older 2-star result
- **THEN** that 3-star best is not counted as ahead of the shared result

### Requirement: Result page offers to play the same puzzle

The result page SHALL offer a way to play the same puzzle:

- for a campaign level, a Play button SHALL unlock the campaign up to and including that level,
  as entering its level code would, and open that level,
- for a daily challenge from today (UTC), a Play button SHALL open the daily challenge,
- for a daily challenge from an earlier day, the page SHALL say that challenge has ended and
  offer today's daily challenge instead.

#### Scenario: Play a shared level

- **WHEN** a viewer who has only reached level 3 opens a level 26 result and taps Play
- **THEN** level 26 opens and is playable

#### Scenario: Play today's shared daily

- **WHEN** a viewer opens a result for today's daily challenge and taps Play
- **THEN** today's daily challenge opens

#### Scenario: Shared daily has ended

- **WHEN** a viewer opens a result for yesterday's daily challenge
- **THEN** the page says that challenge has ended
- **AND** offers today's daily challenge

### Requirement: Result page replays the attempt

When a shared result has a verified move list, the result page SHALL offer a Watch replay
control. Watching the replay SHALL play the attempt's moves, in order, on the board preview,
starting from the starting board, at a pace of about one move every 0.6 seconds, and stop on the
solved board.

While the replay is shown, the page SHALL:

- show which move is being shown and how many there are, as "Move <n> of <total>",
- offer pause and resume,
- offer restarting from the starting board,
- show the pour of each move so the viewer can follow it: the source and destination tubes are
  highlighted as the balls move.

The replay SHALL show the moves that were still on the board when the level was solved. When
that is fewer than the result's move count because some moves were undone, the page SHALL say
how many moves were undone.

#### Scenario: Watching a replay

- **WHEN** a viewer opens a result with a 28-move verified list and taps Watch replay
- **THEN** the board preview plays the 28 moves one after another, ending on a solved board
- **AND** the page shows "Move 1 of 28" through "Move 28 of 28" as it goes

#### Scenario: Pausing and restarting

- **WHEN** a viewer pauses the replay at move 10 and then restarts it
- **THEN** the preview returns to the starting board and "Move 0 of 28" is shown

#### Scenario: Undone moves are explained

- **WHEN** a result's move count is 31 and its replay has 28 moves
- **THEN** the page says that 3 moves were undone

### Requirement: Replay respects reduced motion

When the viewer's device asks for reduced motion, the replay SHALL NOT animate balls or advance
by itself. It SHALL offer previous and next move controls, and each step SHALL change the board
at once.

#### Scenario: Reduced motion steps by hand

- **WHEN** a viewer with reduced motion turned on taps Watch replay
- **THEN** the board stays on the starting board until they tap next
- **AND** each tap on next shows the board after one more move, without animation

### Requirement: No replay without a verified move list

When a shared result has no verified move list, the result page SHALL NOT offer Watch replay,
and SHALL otherwise show the result as before.

#### Scenario: Result from an older build

- **WHEN** a viewer opens a result recorded without a move list
- **THEN** the page shows the result, board preview, rank and Play button
- **AND** does not offer Watch replay
