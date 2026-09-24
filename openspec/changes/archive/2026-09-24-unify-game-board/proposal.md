# Proposal

## Why

The campaign, the daily challenge and the tutorial each run their own copy of the game board:
tap handling, drag, keyboard, undo, hints, cooldown, stuck detection, the tube grid, the
control bar and the modals. Daily and tutorial were forked from the campaign screen to avoid
campaign coupling. The copies have since drifted. The daily challenge lets players pick up a
finished column by tap, drag and keyboard, which breaks `finished-column-lock`. It also shows
no drop highlight while dragging, which breaks `drag-and-drop`. Any new board feature (next up:
`multi-flask-selection`) would have to be built three times and would drift again. The board
should exist once and be the same everywhere.

## What Changes

- One shared board layer drives all three modes: selection and tapping, pouring, drag, keyboard
  navigation and activation, undo, hints with cooldown, restart confirmation, stuck notice,
  move/par/timer display, and the tube grid layout.
- Each mode supplies only what is genuinely its own. The campaign supplies level loading,
  progression, attempt reporting and its solved overlay. The daily challenge supplies date,
  fetch, submission and its solved overlay. The tutorial supplies the fixed board, guided
  prompts, skip and its solved overlay. Each mode also decides which controls it shows (the
  tutorial shows none).
- **Behaviour fixes in the daily challenge** that fall out of sharing:
  - finished columns can no longer be picked up by tap, drag or keyboard
  - drag shows the drop-target hover highlight
- **Tutorial gains** drag-and-drop, keyboard play, the finished-column lock and the adaptive
  grid layout, because it now uses the same board. It keeps its guided prompts, and it still
  has no undo, hint, restart, timer or move counter.
- Campaign behaviour is unchanged.
- Out of scope, noted for later changes: the daily challenge's missing Play Again, differences
  in solved-overlay keys between modes, the N/P shortcuts, and the stuck notice firing on a
  solver "dead" verdict while legal moves remain.

## Capabilities

### New Capabilities
- `shared-game-board`: guarantees that every play mode offers the same board interaction.
  Tap, drag, keyboard and finished-column behaviour are identical across campaign, daily and
  tutorial. Mode-specific surroundings may differ.

### Modified Capabilities
- `tutorial`: the tutorial board supports drag and keyboard play like any other board, and
  still shows no undo, hint, restart or timer controls.

## Impact

- Client only, in `client/src/game/`:
  - `useGame.ts`, `useDailyGame.ts`, `GameScreen.tsx`, `DailyScreen.tsx` and `TutorialScreen.tsx`
    are restructured around a new shared board hook and board component.
  - `ControlButton`, `CooldownSweep`, `hintLabel` and the local `isComplete` copy in DailyScreen
    are removed in favour of the shared versions.
- The `useGame` context API consumed by MainMenu, LevelSelect, StatsPage and others keeps its
  shape.
- Tests: the existing campaign board tests must keep passing. New tests cover the shared board
  hook, and parity tests run daily and tutorial through the same interactions.
- No server, API, rules engine or conformance fixture changes.
