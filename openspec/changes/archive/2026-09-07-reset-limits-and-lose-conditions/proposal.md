## Why

The game currently lets players reset and undo without any cost or friction, which removes tactical tension from the puzzle. At the same time, the solver-based "dead position" banner fires on positions where legal moves still exist but none lead to a win — this feels unfair and discouraging because the player can still see things to try. These two issues erode the sense of challenge the game is meant to provide.

## What Changes

- **Reset confirmation**: Tapping the restart button now shows a confirmation dialog before resetting the level.
- **Resetting stays unlimited**: Losing the level's progress is cost enough, and a restart is how a player earns a fresh set of undos.
- **Reset restores the undo budget**: A reset sets the undo count back to full.
- **Undo budget**: Each attempt (fresh start or post-reset) allows at most 2 undos. Once exhausted, the undo button is disabled until the player resets or advances.
- **Undo count on win screen**: The number of undos used is displayed on the win overlay alongside the existing hint count, so the player sees a complete picture of how much help they used.
- **Revised lose condition**: The "can't be won" banner is removed. A stuck notice appears only when no legal move exists at all. A board the player has already reached this attempt is not remarked on — that is theirs to notice.

## Capabilities

### New Capabilities

- `attempt-limits`: Covers the undo budget, the reset confirmation, and how a reset refills undos.

### Modified Capabilities

- `puzzle-solver`: The "player is told when a position is lost" requirement changes — the trigger shifts from the solver's dead verdict to a no-moves condition. The solver's verdict computation itself is unchanged; only the UI trigger that surfaces the notice changes.

## Impact

- **Client hook** (`client/src/game/useGame.ts`): a pure `attempt` module holds the undo budget; `undo` enforces it and `restart` refills it; the `stuck` flag switches from solver verdict to no-moves.
- **Client UI** (`client/src/game/App.tsx`): New confirmation dialog component; "stuck" toast text and trigger updated; the undo button shows its remaining count and disables when exhausted.
- **No server changes**: Budgets are client-side play aids, not verified on submission. The server already ignores undo/reset during replay.
- **No conformance fixture impact**: The rules engine (move legality, pour, win) is untouched.
