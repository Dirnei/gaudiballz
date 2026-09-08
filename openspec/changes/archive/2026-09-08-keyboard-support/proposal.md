## Why

Playing with a mouse for extended sessions causes hand and wrist discomfort. The game currently requires a mouse or touch for every interaction — selecting tubes, using controls, navigating menus — with no keyboard alternative. Adding keyboard support lets desktop players play comfortably for longer stretches and improves accessibility for players who cannot use a pointer.

## What Changes

- Keyboard navigation between tubes on the game board using arrow keys, with a visible focus indicator showing which tube is targeted.
- Enter or Space to select/pour a tube (same as a tap).
- Number keys to jump directly to a tube by position.
- Shortcut keys for the toolbar actions: undo, hint, restart, and level navigation.
- Escape to deselect the current tube, dismiss overlays, or navigate back.
- Keyboard support in menus (main menu, level select) and modal dialogs (reset confirmation, solved overlay).

## Capabilities

### New Capabilities

- `keyboard-controls`: Defines how the keyboard maps to every game action on the play screen — tube navigation, selection, pouring, toolbar actions — and how focus behaves across screens, overlays, and edge cases.

### Modified Capabilities

## Impact

- `client/src/game/App.tsx` — keydown listener on the play screen, focus management for overlays and screen transitions.
- `client/src/game/Tube.tsx` — visual focus indicator for the currently targeted tube (distinct from the "selected/picked up" state).
- `client/src/game/MainMenu.tsx`, `client/src/game/LevelSelect.tsx` — keyboard navigation for menu items and level grid.
- No server changes. No new dependencies expected — standard DOM keyboard events.
