## Context

See proposal.md — Why. The current client has unlimited undo, unrestricted reset with no
confirmation, and a solver-driven "dead position" banner. All game state lives in the
`useGame` hook (`client/src/game/useGame.ts`) and the engine layer
(`client/src/engine/history.ts`). The UI is a single `App.tsx` component.

Overlays follow a shared visual language: `AnimatePresence` spring animations, rounded
dark cards (`bg-slate-800/95 ring-1 ring-white/10`), backdrop blur. The existing
`AccountPanel.tsx` and the win overlay in `App.tsx` are the reference patterns for modal
dialogs.

## Goals / Non-Goals

**Goals:**
- Add undo and reset budgets to the client-side game state
- Show a confirmation dialog before reset, following existing overlay patterns
- Replace the solver-driven stuck banner with no-moves and loop-detection triggers
- Display undo count on the win screen

**Non-Goals:**
- Server-side enforcement of budgets (server replays submitted moves; undo/reset are not
  part of the submission)
- Changes to the solver algorithm itself (verdict computation stays the same; only the UI
  trigger that shows the notice changes)
- Changes to conformance fixtures or the rules engine
- Persisting budgets across browser sessions (budgets reset on page reload — they are per
  play session, not per account)
- Akka.NET actors are not involved: all changes are client-side React/TypeScript

## Decisions

### 1. Budget state in `GameState` vs. `useGame` hook state

**Decision**: Add `undosUsed`, `resetsUsed`, and `visitedStates` to the `useGame` hook as
React state, not to the engine's `GameState` interface.

**Why**: `GameState` is the pure engine model (board + moves + history) shared with the
solver. Budgets are a UI concern — the engine doesn't know about undo limits. Keeping them
in the hook avoids coupling the engine to play-session concepts.

**Alternative considered**: Extending `GameState` — rejected because it would leak
client-only concepts into the engine, and the solver would have to carry budget fields it
never uses.

### 2. Loop detection via board hashing

**Decision**: Maintain a `Set<string>` of canonical board representations visited in the
current attempt. After each move, hash the resulting board and check membership. Use the
same tube-order-invariant canonicalization the solver already uses for deduplication.

**Why**: The solver already proves this canonicalization works (reordered tubes are the
same position). Reusing it keeps the definition of "same state" consistent.

**Alternative considered**: Comparing `Board` objects structurally on each move — rejected
because it's O(n) per check against all visited states vs. O(1) set lookup.

### 3. Confirmation dialog as inline component

**Decision**: Build the reset confirmation as a new component following the same overlay
pattern as the win screen and `AccountPanel` — full-screen backdrop with a centered card,
spring animation entry, backdrop click to dismiss.

**Why**: Consistent with the existing visual language. No new dependencies needed.

**Alternative considered**: `window.confirm()` — rejected because it breaks the visual
style, can't show remaining-reset count styled consistently, and is blocked by some
mobile browsers.

### 4. Decoupling the stuck banner from the solver verdict

**Decision**: The `stuck` flag in `useGame` switches from `verdict === 'dead'` to
`noLegalMoves || loopDetected`. The solver still runs after each move (for hint
availability), but its `dead` verdict no longer drives the stuck UI.

**Why**: The user wants "you lose" only for truly stuck situations (no moves) or detectable
loops, not for positions where moves exist but none win.

**Risk**: Removing the dead-position banner means a player in an unwinnable position with
legal moves gets no warning. This is the intended behavior — the game trusts the player
to discover it or use hints.

## Risks / Trade-offs

- **Visited-states memory**: The set grows with each move. For typical puzzles (under 200
  moves before a reset), this is negligible. Worst case, a player making thousands of moves
  without resetting accumulates a few hundred KB — acceptable for a browser game.
  → Mitigation: Reset clears the set. No additional bounding needed for realistic play.

- **No server enforcement**: A modified client could bypass budgets. This is acceptable
  because budgets are play aids, not competitive integrity measures — the server already
  verifies only the final move sequence.

- **Page reload resets budgets**: If the player refreshes the page, budgets reset to full.
  This is acceptable and intentional — persisting budgets would require server-side state
  for a purely cosmetic constraint.
