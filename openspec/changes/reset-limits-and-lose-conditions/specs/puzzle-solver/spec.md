## MODIFIED Requirements

### Requirement: The player is told when a position is lost

The game SHALL inform the player when they cannot make progress, but only under two
conditions:

1. No legal move exists at all and the board is not solved.
2. A loop is detected — the player has returned to a board state already visited in the
   current attempt.

The solver's dead verdict (position is unwinnable but legal moves still exist) SHALL NOT
trigger a loss notice on its own. The solver continues to compute verdicts for hint
availability, but the "you lose" presentation is decoupled from it.

The game SHALL offer the ways out — undoing the last move and restarting the level —
at the moment it reports the condition, subject to their respective budgets.

The game SHALL NOT prevent further moves, and SHALL NOT restart the level on the player's
behalf.

#### Scenario: No legal moves triggers the notice

- **WHEN** a move leaves the board with no legal moves and the board is not solved
- **THEN** the player is told they are stuck
- **AND** undo and restart are offered

#### Scenario: A loop triggers the notice

- **WHEN** a move produces a board state the player has already visited in this attempt
- **THEN** the player is told a loop has been detected
- **AND** undo and restart are offered

#### Scenario: A dead position with legal moves does not trigger the notice

- **WHEN** the solver reports the position as dead but legal moves still exist
- **THEN** no loss notice is shown
- **AND** the player may continue making moves

#### Scenario: Undo clears the notice

- **WHEN** the player undoes out of a no-moves or loop state
- **THEN** the notice is no longer shown

#### Scenario: Play is not blocked

- **WHEN** any notice is shown
- **THEN** the player may still make legal moves if any exist
