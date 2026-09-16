## Context

The game already tracks tube completion visually: `GameScreen.tsx` has an `isComplete` helper that dims finished tubes to 66% opacity and adds a subtle ring. The same check needs to gate source selection across three input paths (tap, drag, keyboard), all in the client — no backend work needed.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Block sourcing from finished columns in all three input methods with a single shared predicate.
- Zero change to the rules engine, conformance fixtures, or server.

**Non-Goals:**
- Visual feedback beyond what already exists (the dimming and ring already signal "done").
- Haptic or audio feedback when tapping a locked column.
- Preventing finished columns from being pour destinations.

## Decisions

### Reuse the existing `isComplete` helper

The `isComplete(tube, capacity)` function in `GameScreen.tsx` already implements the exact finished-column check (full + uniform). Rather than duplicating it or pulling in `isUniform` from the engine, the interaction guards will use this same predicate.

*Alternative considered:* Export `isUniform` from `engine/board.ts` and combine with a length check in each call site. Rejected — `isComplete` already exists, is tested by the visual behavior, and keeps the check in one place.

### Guard at the interaction layer, not the engine

The lock is enforced in `useGame.ts` (tap), `GameScreen.tsx` (drag), and the keyboard handler (also `GameScreen.tsx`). The rules engine is deliberately untouched so that:
- Conformance fixtures stay stable (no C# mirror needed).
- Hint and solver can still enumerate all legal moves including from finished tubes.
- Undo that un-finishes a tube re-enables selection automatically — no separate "unlock" path needed.

*Alternative considered:* Add a `FinishedSourceRejection` to the engine's `validate`. Rejected — it would require a matching C# change, new conformance fixtures, and would break the solver's move enumeration.

### Tap handler: guard only in the "no selection" path

When `selected === null`, the tap handler already skips empty tubes. Adding an `isComplete` check here blocks sourcing from finished tubes. When `selected !== null`, the tapped tube is a destination candidate and the existing `play()` call handles legality — no guard needed on that branch.

### Drag handler: guard in `onDragStart`

The `useDrag` hook's `onDragStart` already returns early for empty tubes. Adding the same `isComplete` check there prevents finished tubes from initiating drags.

### Keyboard handler: guard on activation, not focus

Arrow-key focus still lands on finished tubes (they're part of the tube list). Only Enter/Space activation is guarded, matching the tap behavior.

## Risks / Trade-offs

**Undo interaction** — If a player undoes a move that completed a tube, the tube becomes non-finished and is selectable again. This is correct behavior: the guard is stateless (checks the tube on each interaction), so undo works automatically with no special handling.

**Solver and hints** — The solver enumerates moves via the engine's `legalMoves`, which is unchanged. A hint might suggest a move *from* a finished tube in theory, but `legalMoves` never returns such a move in practice because the only legal move from a finished tube is to an empty destination, which the solver would never suggest as it undoes progress.
