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
- Add an undo budget to the client-side game state, refilled by restarting
- Show a confirmation dialog before reset, following existing overlay patterns
- Replace the solver-driven stuck banner with a no-moves trigger
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

**Decision**: Add `undosRemaining`, `undosUsed` and `resetsUsed` to the `useGame` hook as
React state, not to the engine's `GameState` interface.

**Why**: `GameState` is the pure engine model (board + moves + history) shared with the
solver. Budgets are a UI concern — the engine doesn't know about undo limits. Keeping them
in the hook avoids coupling the engine to play-session concepts.

**Alternative considered**: Extending `GameState` — rejected because it would leak
client-only concepts into the engine, and the solver would have to carry budget fields it
never uses.

### 2. Resetting is unlimited, undos are not

**Decision**: Only undo carries a budget. Restarting the level is always available, and it
sets the undo count back to full.

**Why**: Restarting already costs the whole level's progress, which is a real price a
player pays willingly; a cap on top of it only strands someone who wants another go.
Undos are where the tension belongs — they let a player take back a mistake without paying
for it — and making a restart the way to earn more of them keeps the two in one loop.

**Alternative considered**: A budget of 2 resets per level — rejected after playtesting: it
punished the player twice for the same mistake and turned the restart button into another
thing to ration.

### 3. Confirmation dialog as inline component

**Decision**: Build the reset confirmation as a new component following the same overlay
pattern as the win screen and `AccountPanel` — full-screen backdrop with a centered card,
spring animation entry, backdrop click to dismiss.

**Why**: Consistent with the existing visual language. No new dependencies needed.

**Alternative considered**: `window.confirm()` — rejected because it breaks the visual
style and is blocked by some mobile browsers.

### 4. Decoupling the stuck banner from the solver verdict

**Decision**: The `stuck` flag in `useGame` switches from `verdict === 'dead'` to
`noLegalMoves`. The solver runs only when a hint is asked for; its `dead` verdict no longer
drives the stuck UI.

**Why**: The player is told only what they could see on the board for themselves. A
position with moves left but none winning stays unannounced, and so does a repeated board:
detecting the circle was tried and cut, because pointing it out reads as the game watching
over the player's shoulder.

**Risk**: Removing the dead-position banner means a player in an unwinnable position with
legal moves gets no warning. This is the intended behavior — the game trusts the player
to discover it or use hints.

## Risks / Trade-offs

- **No server enforcement**: A modified client could bypass budgets. This is acceptable
  because budgets are play aids, not competitive integrity measures — the server already
  verifies only the final move sequence.

- **Page reload resets budgets**: If the player refreshes the page, budgets reset to full.
  This is acceptable and intentional — persisting budgets would require server-side state
  for a purely cosmetic constraint.
