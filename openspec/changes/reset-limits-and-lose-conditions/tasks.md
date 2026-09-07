## 1. Board canonicalization for loop detection

- [ ] 1.1 Test: a canonical key for a board is identical regardless of tube order
- [ ] 1.2 Extract or expose the solver's tube-order-invariant canonicalization as a reusable `canonicalKey(board)` function in the engine

## 2. Undo budget

- [ ] 2.1 Test: undo count starts at 2, decrements on each undo, and `canUndo` returns false at 0 even when history is non-empty
- [ ] 2.2 Add `undosRemaining` state to `useGame`; gate the existing `undo` callback on `undosRemaining > 0` and decrement on use
- [ ] 2.3 Test: loading a new level resets undos to 2
- [ ] 2.4 Show remaining undo count as a badge on the undo button in `App.tsx`; disable the button when 0

## 3. Reset budget and confirmation

- [ ] 3.1 Test: reset count starts at 2, decrements on each reset, and resets cannot proceed at 0
- [ ] 3.2 Add `resetsRemaining` state to `useGame`; gate `restart` on `resetsRemaining > 0` and decrement on use
- [ ] 3.3 Test: reset restores undo budget to 2
- [ ] 3.4 Wire reset to also set `undosRemaining` back to 2 and clear `visitedStates`
- [ ] 3.5 Test: advancing to the next level restores the reset budget to 2
- [ ] 3.6 Reset `resetsRemaining` to 2 when `levelId` changes
- [ ] 3.7 Build `ConfirmResetDialog` component following the existing overlay pattern (backdrop + centered card + spring animation)
- [ ] 3.8 Show remaining-reset count in the dialog body; wire confirm to call `restart`, dismiss to close
- [ ] 3.9 Show remaining reset count as a badge on the restart button; disable when 0

## 4. Loop detection

- [ ] 4.1 Test: visiting the same canonical board state twice in one attempt sets `loopDetected` to true
- [ ] 4.2 Test: undoing out of the repeated state clears `loopDetected`
- [ ] 4.3 Test: resetting clears the visited-states set
- [ ] 4.4 Add `visitedStates` (Set<string>) and `loopDetected` to `useGame`; add the canonical key of each post-move board to the set; set `loopDetected` when a key is already present

## 5. Revised stuck / lose condition

- [ ] 5.1 Test: `stuck` is true when `legalMoves` returns an empty list and the board is not solved
- [ ] 5.2 Test: `stuck` is true when `loopDetected` is true
- [ ] 5.3 Test: `stuck` is false when the solver reports dead but legal moves exist and no loop
- [ ] 5.4 Replace the `stuck` derivation in `useGame` — switch from `verdict === 'dead'` to `noLegalMoves || loopDetected`
- [ ] 5.5 Update the stuck toast text and styling: show "No moves available" for no-moves, "Loop detected" for loops; keep undo/reset buttons but respect budgets (disabled when exhausted)

## 6. Win screen stats

- [ ] 6.1 Test: `undosUsed` and `resetsUsed` are tracked and returned by `useGame`
- [ ] 6.2 Add `undosUsed` counter (incremented on each undo) and expose it alongside `hintsUsed`
- [ ] 6.3 Display undos used on the win overlay (same style as hints), hidden when 0
- [ ] 6.4 Display resets used on the win overlay, hidden when 0

## 7. Integration and visual verification

- [ ] 7.1 Rebuild the Docker image and playtest: verify undo disables after 2 uses, reset shows confirmation, resets restore undo budget, and the stuck toast fires only on no-moves / loop
- [ ] 7.2 Verify the win screen shows undo and reset counts when non-zero
