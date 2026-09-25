# Spec Delta

## ADDED Requirements

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
