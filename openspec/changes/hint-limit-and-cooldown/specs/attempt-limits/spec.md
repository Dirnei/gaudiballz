## MODIFIED Requirements

### Requirement: Reset restores the undo budget

Resetting a level SHALL start a new attempt: the undo count returns to the full budget
of 5, the hint count returns to zero, **and the hint budget returns to the full 3**.

The hint cooldown SHALL restart from the moment of the reset, so the player waits the
full 30 seconds before the first hint of the new attempt is available.

#### Scenario: Undo budget is restored after reset

- **WHEN** the player has 0 undos remaining and resets the level
- **THEN** the player has 5 undos available on the new attempt

#### Scenario: The hint count starts again after reset

- **WHEN** the player has used hints and then resets the level
- **THEN** the hint count for the attempt is zero

#### Scenario: Hint budget is restored after reset

- **WHEN** the player has 0 hints remaining and resets the level
- **THEN** the player has 3 hints available on the new attempt

#### Scenario: Hint cooldown restarts after reset

- **WHEN** the player resets the level
- **THEN** the hint control is disabled for 30 seconds from the moment of the reset
