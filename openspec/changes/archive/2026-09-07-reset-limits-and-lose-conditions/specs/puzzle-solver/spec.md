## REMOVED Requirements

### Requirement: The player is told when a position is lost

**Reason**: Announcing a proved-unwinnable position the moment it happens hands the player a
free oracle. Play a move, read the verdict, undo, try the next one — the puzzle becomes
trial and error with perfect feedback instead of something to think through, and the undo
budget stops biting because it is obvious which move to spend it on. Losing is the
consequence that makes planning matter.

**Migration**: Replaced by "The player is told when they cannot continue", which fires only
on the one condition the player could observe for themselves — no legal moves at all. The
solver still computes verdicts; hints are unaffected.

## ADDED Requirements

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
