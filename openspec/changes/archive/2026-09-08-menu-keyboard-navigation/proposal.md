## Why

The gameplay screen has full keyboard support, but every other screen — main menu, level select, account panel, ball picker, and achievements — is touch/mouse-only. A player who navigates the puzzle by keyboard hits a wall the moment they leave the board.

## What Changes

- Main menu buttons (Play, Level Select, Achievements, Enter Code) are navigable with arrow keys and activatable with Enter/Space.
- Level-select grid supports arrow-key navigation through tiles, Enter to select, and Escape to go back.
- Account panel closes with Escape and its controls (Log in, Register, Log out, username input) are navigable with arrow keys.
- Ball picker grid supports arrow-key navigation through ball colours, Enter/Space to select.
- Achievements screen supports Escape to go back.
- Focus is visually indicated on all screens, consistent with the play-screen focus style.
- Touch and mouse continue to work alongside keyboard on all screens.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `keyboard-controls`: Extends the existing play-screen keyboard spec to cover all non-play screens: main menu, level select grid, account panel, ball picker, and achievements.

## Impact

- **Client only**: All changes are in the React frontend. No server, API, or database changes.
- **Components affected**: `MainMenu.tsx`, `LevelSelect.tsx`, `AccountPanel.tsx`, `BallPicker.tsx`, `AchievementsScreen.tsx`, and the keyboard handler in `App.tsx`.
- **No breaking changes**: Existing touch and mouse behavior is unchanged.
