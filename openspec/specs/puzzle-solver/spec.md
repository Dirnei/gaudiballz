# puzzle-solver Specification

## Purpose
Decides whether a position can still be won, and chooses the next move when it can. This is
what lets the game offer a hint and what lets it tell a player their position is already
lost instead of leaving them tapping at a dead board.

## Requirements

### Requirement: Solver verdict

Given a board, the solver SHALL return exactly one of three verdicts:

- **winnable** — a sequence of legal moves reaching a solved board was found
- **dead** — no such sequence exists, established by exhausting the search
- **unknown** — the search ended on its budget before deciding

The solver SHALL NOT report **dead** unless the search space was exhausted. A search that
ends on its budget SHALL report **unknown**.

A solved board SHALL be reported as winnable.

#### Scenario: A solvable position reports winnable

- **WHEN** the board still has a sequence of legal moves reaching a solved state
- **THEN** the verdict is winnable

#### Scenario: An already solved board is winnable

- **WHEN** every tube is empty or full and single-coloured
- **THEN** the verdict is winnable

#### Scenario: A board with no legal moves at all is dead

- **WHEN** no legal move exists and the board is not solved
- **THEN** the verdict is dead

#### Scenario: Exhausting the budget is reported as unknown

- **WHEN** the search reaches its node or time budget without deciding
- **THEN** the verdict is unknown
- **AND** the verdict is not dead

### Requirement: Bounded search

The solver SHALL accept a limit on the work it may do, expressed as a maximum number of
positions examined and a maximum elapsed time, and SHALL stop once either is reached.

The solver MUST remain responsive enough to be called during play without the interface
becoming unresponsive.

Repeated positions SHALL be recognised so the search does not revisit them. Tube order
carries no meaning, so two positions that differ only by the arrangement of their tubes
SHALL be treated as the same position.

#### Scenario: The search stops at its budget

- **WHEN** a position is given a small budget
- **THEN** the search stops rather than running to completion
- **AND** it reports unknown

#### Scenario: Reordered tubes count as the same position

- **WHEN** two boards hold the same tube contents in a different order
- **THEN** the solver treats them as one position

### Requirement: Hint

When a position is winnable, the solver SHALL be able to name a legal move that keeps it
winnable.

Playing a hinted move SHALL leave the position winnable, so following hints repeatedly
solves the level.

When a position is not winnable, no hint SHALL be offered.

#### Scenario: A hint keeps the position winnable

- **WHEN** a hint is requested on a winnable position and the suggested move is played
- **THEN** the resulting position is still winnable

#### Scenario: Following hints solves the level

- **WHEN** a hint is requested and played repeatedly from a winnable position
- **THEN** the board reaches a solved state

#### Scenario: A dead position offers no hint

- **WHEN** the position cannot be won
- **THEN** no hint is offered

### Requirement: Hints are free

Hints SHALL NOT be limited by count, currency, waiting, or advertising.

The number of hints used SHALL be recorded per attempt, so a level cleared with help can be
told apart from one cleared without it.

#### Scenario: Hints do not run out

- **WHEN** a player requests many hints on one level
- **THEN** every request is answered

#### Scenario: Hint use is counted

- **WHEN** a player uses hints and then clears the level
- **THEN** the number of hints used in that attempt is available

### Requirement: The player is told when they cannot continue

The game SHALL inform the player when no legal move exists and the board is not solved.

The solver's dead verdict — the position is unwinnable but legal moves still exist — SHALL
NOT trigger a notice. Neither SHALL returning to a board already played this attempt: going
round in a circle is something the player can see on the board, and pointing it out reads as
the game watching over their shoulder. The solver continues to compute verdicts for hint
availability; the notice is decoupled from it.

The game SHALL offer the ways out — undoing the last move and restarting the level — at the
moment it reports the condition, subject to the undo budget.

The game SHALL NOT prevent further moves, and SHALL NOT restart the level on the player's
behalf.

#### Scenario: No legal moves triggers the notice

- **WHEN** a move leaves the board with no legal moves and the board is not solved
- **THEN** the player is told they are stuck
- **AND** undo and restart are offered

#### Scenario: A repeated position does not trigger the notice

- **WHEN** a move produces a board the player has already reached in this attempt
- **THEN** no notice is shown
- **AND** the player may continue making moves

#### Scenario: A dead position with legal moves does not trigger the notice

- **WHEN** the solver reports the position as dead but legal moves still exist
- **THEN** no notice is shown
- **AND** the player may continue making moves

#### Scenario: Undo clears the notice

- **WHEN** the player undoes out of a no-moves state
- **THEN** the notice is no longer shown

#### Scenario: Play is not blocked

- **WHEN** the notice is shown
- **THEN** the player may still make legal moves if any exist
