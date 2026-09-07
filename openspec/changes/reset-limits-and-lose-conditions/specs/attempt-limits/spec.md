## Purpose

Governs how many times a player may undo moves and restart a level within a single
level, adding tactical cost to helpers that were previously unlimited.

## ADDED Requirements

### Requirement: Undo budget

Each attempt (from the first move after loading or resetting) SHALL allow at most 2 undos.
The undo control SHALL be disabled once the budget is exhausted. The remaining undo count
SHALL be visible to the player at all times.

Using a hint SHALL NOT consume an undo.

#### Scenario: Undo is available at the start of an attempt

- **WHEN** a level is loaded or has just been reset
- **THEN** the player has 2 undos available

#### Scenario: Each undo reduces the remaining count

- **WHEN** the player has 2 undos remaining and undoes a move
- **THEN** the player has 1 undo remaining

#### Scenario: Undo is disabled when exhausted

- **WHEN** the player has 0 undos remaining
- **THEN** the undo control is disabled and cannot be activated

#### Scenario: Undo count is visible

- **WHEN** a level is in progress
- **THEN** the remaining undo count is displayed near the undo control

### Requirement: Reset budget

Each level SHALL allow at most 2 resets. The reset count persists across attempts within
the same level. The reset control SHALL be disabled once the budget is exhausted.
Advancing to a new level SHALL restore the full reset budget.

#### Scenario: Resets are available on a fresh level

- **WHEN** the player starts a new level
- **THEN** the player has 2 resets available

#### Scenario: Each reset reduces the remaining count

- **WHEN** the player has 2 resets remaining and resets the level
- **THEN** the player has 1 reset remaining

#### Scenario: Reset is disabled when exhausted

- **WHEN** the player has 0 resets remaining
- **THEN** the reset control is disabled and cannot be activated

#### Scenario: Advancing to the next level restores the budget

- **WHEN** the player completes a level and moves to the next
- **THEN** the player has 2 resets available on the new level

### Requirement: Reset confirms before acting

Activating the reset control SHALL present a confirmation prompt before resetting the
level. The prompt SHALL state how many resets remain after this one. The player MUST
explicitly confirm to proceed; dismissing the prompt SHALL leave the game unchanged.

#### Scenario: Confirmation is shown before reset

- **WHEN** the player taps the reset control
- **THEN** a confirmation prompt appears before the level is reset

#### Scenario: Confirming resets the level

- **WHEN** the player confirms the reset prompt
- **THEN** the level resets to its initial board state

#### Scenario: Dismissing the prompt does nothing

- **WHEN** the player dismisses the reset prompt without confirming
- **THEN** the board and all state remain unchanged

#### Scenario: Prompt shows remaining resets

- **WHEN** the player has 2 resets remaining and taps reset
- **THEN** the prompt indicates that 1 reset will remain after confirming

### Requirement: Reset restores the undo budget

Resetting a level SHALL set the undo count back to the full budget of 2, so the new
attempt starts with full undo availability.

#### Scenario: Undo budget is restored after reset

- **WHEN** the player has 0 undos remaining and resets the level
- **THEN** the player has 2 undos available on the new attempt

### Requirement: Undo and reset counts on the win screen

When a level is solved, the win overlay SHALL display the number of undos used alongside
the existing hint count. Resets used SHALL also be visible.

#### Scenario: Undos used is shown on solve

- **WHEN** a player solves a level after using 1 undo
- **THEN** the win overlay shows that 1 undo was used

#### Scenario: Zero undos is not shown

- **WHEN** a player solves a level without using any undos
- **THEN** the win overlay does not show an undo count

### Requirement: Loop detection

The game SHALL track board states visited during the current attempt. When a move produces
a board state the player has already visited in the same attempt, the game SHALL inform
the player that they are in a loop.

Resetting the level SHALL clear the visited-states history.

#### Scenario: Revisiting a state triggers the loop notice

- **WHEN** the player makes a sequence of moves that returns the board to a previously visited state
- **THEN** the game informs the player that a loop has been detected

#### Scenario: The notice clears when the loop is broken

- **WHEN** the player undoes out of the repeated state
- **THEN** the loop notice is no longer shown

#### Scenario: Reset clears visited history

- **WHEN** the player resets the level
- **THEN** the visited-states history is empty
- **AND** no loop notice is shown

### Requirement: No-moves notice

When no legal move exists and the board is not solved, the game SHALL inform the player
that they are stuck with no available moves.

#### Scenario: No legal moves triggers the notice

- **WHEN** the board has no legal moves and is not solved
- **THEN** the player is told there are no moves available

#### Scenario: The notice offers undo and reset

- **WHEN** the no-moves notice is shown
- **THEN** undo and reset are offered (subject to their respective budgets)
