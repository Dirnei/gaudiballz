## Why

The game currently lets players reset and undo without any cost or friction, which removes tactical tension from the puzzle. At the same time, the solver-based "dead position" banner fires on positions where legal moves still exist but none lead to a win — this feels unfair and discouraging because the player can still see things to try. These two issues erode the sense of challenge the game is meant to provide.

## What Changes

- **Reset confirmation**: Tapping the restart button now shows a confirmation dialog before resetting the level. The dialog tells the player how many resets they have left.
- **Reset budget**: Each level allows at most 2 resets. Once exhausted, the restart button is disabled for the remainder of that level. Advancing to the next level restores the budget.
- **Reset clears the undo counter**: A reset sets the undo count back to zero, restoring the full undo budget.
- **Undo budget**: Each attempt (fresh start or post-reset) allows at most 2 undos. Once exhausted, the undo button is disabled until the player resets or advances.
- **Undo count on win screen**: The number of undos used is displayed on the win overlay alongside the existing hint count, so the player sees a complete picture of how much help they used.
- **Revised lose condition**: The "can't be won" banner is removed. A "you lose" notice appears only when:
  1. No legal move exists at all (the board is completely stuck), or
  2. An endless loop is detected (the player has returned to a board state they already visited).

## Capabilities

### New Capabilities

- `attempt-limits`: Covers the reset budget, undo budget, confirmation dialog, and how budgets interact with level progression.

### Modified Capabilities

- `puzzle-solver`: The "player is told when a position is lost" requirement changes — the trigger shifts from the solver's dead verdict to a no-moves / loop-detection condition. The solver's verdict computation itself is unchanged; only the UI trigger that surfaces the notice changes.

## Impact

- **Client engine** (`client/src/engine/history.ts`): `GameState` gains reset and undo counters and a visited-states set for loop detection.
- **Client hook** (`client/src/game/useGame.ts`): `restart` and `undo` enforce budgets; the `stuck` flag switches from solver verdict to the new conditions.
- **Client UI** (`client/src/game/App.tsx`): New confirmation dialog component; "stuck" toast text and trigger updated; restart/undo buttons show remaining counts and disable when exhausted.
- **No server changes**: Budgets are client-side play aids, not verified on submission. The server already ignores undo/reset during replay.
- **No conformance fixture impact**: The rules engine (move legality, pour, win) is untouched.
