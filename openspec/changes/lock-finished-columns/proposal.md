## Why

A finished column (full, single-colour) has no useful moves left — pouring from it only undoes progress. Letting players select one wastes a tap, creates confusion on dense boards, and forces a second tap to deselect. Locking finished columns out of selection removes a pointless interaction and reinforces the visual "done" state the tubes already show.

## What Changes

- Tapping a finished column does nothing (no selection, no error). If another column is already selected, tapping a finished column attempts a pour *to* it as today — only sourcing from a finished column is blocked.
- Dragging from a finished column is not possible; it does not initiate a drag gesture.
- Keyboard navigation can still focus a finished column, but activating it (Enter / Space) does not select it as a source.
- Finished columns are still valid *destinations* — the player can pour matching balls into a nearly-finished column to complete it.
- No rules engine changes. The underlying move legality in sort-puzzle-rules is unchanged; both TS and C# engines still accept the move if called directly. The lock is a UI-level guard only.

## Capabilities

### New Capabilities
- `finished-column-lock`: Prevents selecting a finished column as a pour source across all input methods (tap, drag, keyboard).

### Modified Capabilities
- `drag-and-drop`: Drag initiation requirement must exclude finished tubes alongside empty tubes.

## Impact

- `client/src/game/useGame.ts` — `tapTube` handler gains a finished-column guard.
- `client/src/game/GameScreen.tsx` — drag `onDragStart` gains a finished-column guard; the `isComplete` helper already exists here for visual use.
- `client/src/game/GameScreen.tsx` — keyboard activation (Enter/Space) gains the same guard.
- No backend changes. No conformance fixture changes.
