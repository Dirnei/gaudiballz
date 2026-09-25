# completion-verification Specification

## Purpose

Makes a completion count only when the server can replay it: the client says how it solved the
board, and the server checks every move against the rules before the result is recorded.

## Requirements

### Requirement: Completions carry their moves

A campaign or daily challenge completion sent to the server SHALL include the ordered list of
moves that took the starting board to the solved board, and the rule set version they were
played under.

The list SHALL contain only the moves still on the board when the level was solved: a move that
was undone SHALL NOT appear. A move played by a hint SHALL appear like any other move. A
multi-pour SHALL appear as one move per selected flask, in selection order.

A completion that waits in the offline queue SHALL keep its move list until it is sent.

#### Scenario: Undone moves are left out

- **WHEN** a player plays moves A, B and C, undoes C, then plays D and solves the level
- **THEN** the completion's move list is A, B, D

#### Scenario: Hint moves are included

- **WHEN** a player solves a level where the third move was played by a hint
- **THEN** the completion's move list includes that move in third place

#### Scenario: Queued completion keeps its moves

- **WHEN** a player solves a level offline and the completion is sent once a connection returns
- **THEN** the sent completion includes the same move list

### Requirement: The server replays every completion

Before scoring a completion that carries a move list, the server SHALL replay the moves, in
order, on the starting board of the level or daily challenge being completed, under the rule set
version the completion declares. It SHALL reject the completion when:

- any move is illegal on the board it is played on,
- the board is not solved after the last move,
- the claimed move count is lower than the number of moves in the list, or
- the list has more than 2000 moves.

The claimed move count MAY be higher than the list, because moves that were later undone still
count towards the move count.

A rejected completion SHALL NOT be recorded anywhere: not in progress, points, leaderboards,
daily results, streaks, achievements or shared results. The server SHALL answer it as a bad
request that names the reason.

#### Scenario: A genuine solution is accepted

- **WHEN** a player submits level 26 with a move list that solves its starting board and a
  claimed move count of 31, with the list 28 moves long
- **THEN** the completion is recorded and scored on 31 moves

#### Scenario: An illegal move is rejected

- **WHEN** a completion's move list contains a pour onto a full tube
- **THEN** the completion is rejected and nothing is recorded

#### Scenario: A list that does not solve the board is rejected

- **WHEN** a completion's moves are all legal but leave the board unsolved
- **THEN** the completion is rejected and nothing is recorded

#### Scenario: Claiming fewer moves than were played is rejected

- **WHEN** a completion claims 5 moves but its move list has 28
- **THEN** the completion is rejected and nothing is recorded

#### Scenario: The daily is replayed on the day's board

- **WHEN** a daily challenge completion is submitted
- **THEN** its moves are replayed on the starting board of that day's daily challenge

### Requirement: Rejected completions are not retried

When the server rejects a queued completion as a bad request, the client SHALL remove it from
the queue rather than send it again.

#### Scenario: A rejected queued completion is dropped

- **WHEN** a queued completion is rejected by the server
- **THEN** it is no longer in the queue and is not sent again

### Requirement: Completions from older builds are still accepted

A completion that carries no move list SHALL still be accepted and scored as before, so that
progress queued by an older build of the game is not lost. Such a completion SHALL be recorded
as unverified, and its shared result SHALL have no replay.

#### Scenario: A queued completion from an older build

- **WHEN** a completion without a move list arrives from the offline queue
- **THEN** it is recorded and scored
- **AND** its shared result is marked as having no replay
