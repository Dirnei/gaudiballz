## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Undo and reset counts on the win screen

**Reason**: Neither count says anything worth reading. Undos are budgeted, so the game has
already limited them, and resetting is unlimited by design — tallying restarts on the win
screen reads as a scolding for something the game invites the player to do. Hints are the
one kind of help a player takes freely, and the win screen already showed them.

**Migration**: The win screen keeps its existing hint count and shows nothing else. Undos
used and resets used are no longer tracked at all.
