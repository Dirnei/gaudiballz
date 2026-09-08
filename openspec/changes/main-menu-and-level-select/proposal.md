## Why

The game currently drops the player straight into gameplay with no navigation structure. There is no title screen, no way to browse or pick a level, and the only way to enter a level code is buried inside the account panel. A proper main menu and level selection screen give the game a front door, let players see their progress at a glance, and move level-code entry to a natural, discoverable location.

## What Changes

- Add a **main menu screen** that appears on launch with options to play, select a level, and enter a level code.
- Add a **level selection screen** showing a scrollable grid of levels with visual progress indicators (locked, unlocked, completed, current) so players can jump to any unlocked level.
- **Move level-code entry** from the AccountPanel to the main menu so it is accessible without opening the account sheet.
- Remove the level-code entry section from the AccountPanel — it will live only on the main menu.
- Introduce a lightweight **screen/view switching** mechanism so the app can transition between the menu, level select, and gameplay screens.
- Add a way to **return to the main menu** from the gameplay screen (e.g. a back/home button in the header).

## Capabilities

### New Capabilities
- `main-menu`: The main menu screen — entry point of the app with play, level select, and level code entry.
- `level-select`: The level selection screen — browsable grid of levels showing progress state and gating.

### Modified Capabilities
- `level-codes`: Level code entry moves from the account panel to the main menu screen.
- `level-progression`: The level selection screen exposes progression state (completed, current, locked) and respects the existing ceiling gating.

## Impact

- **client/src/game/App.tsx**: Major restructuring — needs a screen switcher wrapping the current gameplay view plus the two new screens.
- **client/src/game/AccountPanel.tsx**: Remove the level-code entry section (bottom half below the divider).
- **client/src/game/useGame.ts**: Expose level progress data (completed levels, ceiling) in a form the level-select grid can consume. May need a new API call to fetch all level completions, or derive from existing progress.
- **New files**: MainMenu component, LevelSelect component, and a screen-management hook or state.
- **Server API**: May need a new endpoint or extend an existing one to return the list of completed levels (currently only `highestCompleted` is tracked, not per-level status — needs investigation).
- **No breaking changes** to existing gameplay, persistence, or identity systems.
