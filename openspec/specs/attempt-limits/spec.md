# attempt-limits Specification

## Purpose
Governs how many times a player may undo within an attempt, so that a mistake costs
something and a move is worth thinking about before it is made.

Resetting is not limited: it already costs the progress made on the level, and it is the way
a player earns a fresh set of undos.

## Requirements

### Requirement: Undo budget

Each attempt (from the first move after loading or resetting) SHALL allow at most 5 undos.
The undo control SHALL be disabled once the budget is exhausted. The remaining undo count
SHALL be visible to the player at all times.

Using a hint SHALL NOT consume an undo.

#### Scenario: Undo is available at the start of an attempt

- **WHEN** a level is loaded or has just been reset
- **THEN** the player has 5 undos available

#### Scenario: Each undo reduces the remaining count

- **WHEN** the player has 5 undos remaining and undoes a move
- **THEN** the player has 4 undos remaining

#### Scenario: Undo is disabled when exhausted

- **WHEN** the player has 0 undos remaining
- **THEN** the undo control is disabled and cannot be activated

#### Scenario: Undo count is visible

- **WHEN** a level is in progress
- **THEN** the remaining undo count is displayed near the undo control

### Requirement: Reset confirms before acting

Activating the reset control SHALL present a confirmation prompt before resetting the
level. The player MUST explicitly confirm to proceed; dismissing the prompt SHALL leave the
game unchanged.

Resetting SHALL NOT be limited. Losing the progress made on the level is cost enough; a cap
on top of that would only strand a player who wants to start the level again.

#### Scenario: Confirmation is shown before reset

- **WHEN** the player taps the reset control
- **THEN** a confirmation prompt appears before the level is reset

#### Scenario: Confirming resets the level

- **WHEN** the player confirms the reset prompt
- **THEN** the level resets to its initial board state

#### Scenario: Dismissing the prompt does nothing

- **WHEN** the player dismisses the reset prompt without confirming
- **THEN** the board and all state remain unchanged

#### Scenario: Resetting is always available

- **WHEN** the player has reset the level several times already
- **THEN** the reset control is still available

### Requirement: Reset restores the undo budget

Resetting a level SHALL start a new attempt: the undo count returns to the full budget of 5,
and the hint count returns to zero.

This is what resetting is for: undos are the limited resource, and starting the level again
is how a player earns more of them. The hint count starts again with the attempt because the
attempt it belonged to has been given up, and its cost has already been paid in the progress
that was thrown away.

#### Scenario: Undo budget is restored after reset

- **WHEN** the player has 0 undos remaining and resets the level
- **THEN** the player has 5 undos available on the new attempt

#### Scenario: The hint count starts again after reset

- **WHEN** the player has used hints and then resets the level
- **THEN** the hint count for the attempt is zero

### Requirement: No-moves notice

When no legal move exists and the board is not solved, the game SHALL inform the player
that they are stuck with no available moves.

#### Scenario: No legal moves triggers the notice

- **WHEN** the board has no legal moves and is not solved
- **THEN** the player is told there are no moves available

#### Scenario: The notice offers undo and reset

- **WHEN** the no-moves notice is shown
- **THEN** undo and reset are offered (subject to their respective budgets)
