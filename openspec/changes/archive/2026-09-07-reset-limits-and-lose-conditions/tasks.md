## 1. Undo budget

- [x] 1.1 Test: undo count starts at 2, decrements on each undo, and `canUndo` returns false at 0 even when history is non-empty
- [x] 1.2 Add `undosRemaining` state to `useGame`; gate the existing `undo` callback on `undosRemaining > 0` and decrement on use
- [x] 1.3 Test: loading a new level resets undos to 2
- [x] 1.4 Show remaining undo count as a badge on the undo button in `App.tsx`; disable the button when 0

## 2. Reset confirmation

- [x] 2.1 Test: reset restores the undo budget to 2
- [x] 2.2 Test: resetting is not limited — repeated resets keep working and keep restoring the undo budget
- [x] 2.3 Wire reset to set `undosRemaining` back to 2; leave the reset control always enabled, since losing the progress on the level is cost enough and undos are the scarce resource a restart earns back
- [x] 2.4 Build `ConfirmResetDialog` component following the existing overlay pattern (backdrop + centered card + spring animation)
- [x] 2.5 Wire confirm to call `restart`, dismiss to close; the dialog body states what the restart gives back rather than a remaining count

## 3. Revised stuck / lose condition

- [x] 3.1 Test: `stuck` is true when `legalMoves` returns an empty list and the board is not solved
- [x] 3.2 Test: `stuck` is false when the solver reports dead but legal moves exist
- [x] 3.3 Replace the `stuck` derivation in `useGame` — switch from `verdict === 'dead'` to `noLegalMoves`. The per-move solver call became dead once nothing consumed the verdict, so it is gone: the solver now runs only when a hint is asked for
- [x] 3.4 Update the stuck toast text and styling: show "No moves left." with undo and restart on it; undo respects its budget, restart is always available
- [x] 3.5 No notice for a repeated board: a player going in a circle can see that on the board, and remarking on it reads as the game watching over their shoulder

## 4. Win screen stats

- [x] 4.1 Test: `undosUsed` and `resetsUsed` are tracked and returned by `useGame`
- [x] 4.2 Add `undosUsed` counter (incremented on each undo) and expose it alongside `hintsUsed`
- [x] 4.3 Display undos used on the win overlay (same style as hints), hidden when 0
- [x] 4.4 Display resets used on the win overlay, hidden when 0

## 5. Integration and visual verification

- [x] 5.1 Rebuild the Docker image and playtest: verify undo disables after 2 uses, reset shows confirmation, resets restore the undo budget, and the stuck toast fires only when there are no moves at all
- [x] 5.2 Verify the win screen shows undo and reset counts when non-zero
