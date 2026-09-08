## 1. Screen switching infrastructure

- [x] 1.1 Add a `Screen` type (`'menu' | 'levels' | 'play'`) and `screen` state to `App.tsx`, defaulting to `'menu'`
- [x] 1.2 Wrap the existing gameplay JSX in a conditional that renders only when `screen === 'play'`; render placeholder components for `'menu'` and `'levels'`
- [x] 1.3 Add `AnimatePresence`-based transitions between screens

## 2. Expose per-level progress from useGame

- [x] 2.1 Add a test that `useGame` exposes a `progress` map with per-level completion data after fetching from the server
- [x] 2.2 Parse the existing `levels` array from `GET /api/v1/progress` into a `Map<number, { moves: number; hints: number }>` and expose it on the `useGame` return value

## 3. Main menu screen

- [x] 3.1 Create `client/src/game/MainMenu.tsx` with a Play button, Level Select button, and Enter Code button, using the existing glass/dark visual style
- [x] 3.2 Wire the Play button to set `screen` to `'play'` and load the player's current level (last level from localStorage, or level 1)
- [x] 3.3 Wire the Level Select button to set `screen` to `'levels'`
- [x] 3.4 Add the account button to the main menu (reuses the existing avatar/login pill, opens AccountPanel)

## 4. Level code entry on the main menu

- [x] 4.1 Move the `enteringCode` state, input field, and `handleCodeUnlock` logic from `AccountPanel.tsx` into `MainMenu.tsx`
- [x] 4.2 On successful code unlock, transition to gameplay screen with the unlocked level loaded
- [x] 4.3 On invalid code, show the error on the main menu and stay on the menu
- [x] 4.4 Remove the level-code entry section (everything below the `border-t border-white/8` divider) from `AccountPanel.tsx`

## 5. Level selection screen

- [x] 5.1 Create `client/src/game/LevelSelect.tsx` with a CSS grid of level tiles
- [x] 5.2 Render tiles for levels 1 through the ceiling plus a small locked preview (e.g. ceiling + 5 or a round number)
- [x] 5.3 Style tiles in four states: completed (show best moves), current (highlight ring), unlocked (default), locked (dimmed/faded, not tappable)
- [x] 5.4 Wire tapping an unlocked tile to set `screen` to `'play'` and load that level
- [x] 5.5 Add a back button to return to the main menu

## 6. Navigation from gameplay back to menu

- [x] 6.1 Add a home/back `IconButton` in the gameplay header (left of `LevelBadge`)
- [x] 6.2 Wire it to set `screen` to `'menu'` without discarding board state (useGame stays mounted)

## 7. Verification

- [x] 7.1 Rebuild the Docker image and test the full flow: launch → menu → play → back to menu → level select → pick a level → play → solve → back to menu
- [x] 7.2 Verify level code entry works from the main menu (valid code navigates to gameplay, invalid code shows error)
- [x] 7.3 Verify the account panel no longer contains level code entry
- [x] 7.4 Verify level select tiles reflect correct state (completed, current, locked) and show best moves
- [x] 7.5 Verify board state is preserved when navigating away from gameplay and back
