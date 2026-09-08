## 1. Focus indicator CSS

- [ ] 1.1 Add a shared keyboard-focus CSS class (ring/outline) matching the play-screen focus indicator style, usable by all components
- [ ] 1.2 Verify the focus style renders consistently in both light and dark contexts

## 2. Main menu keyboard navigation

- [ ] 2.1 Write tests: arrow keys navigate between menu items, wrapping at ends; Enter/Space activates focused item; arrow keys suppressed during code entry; Escape closes code entry
- [ ] 2.2 Add `focusedIndex` state and `useEffect` keydown listener to `MainMenu.tsx` — Up/Down move focus, Enter/Space activate, text-input guard suppresses arrows during code entry
- [ ] 2.3 Add Escape handling: close code entry if open, no-op at root
- [ ] 2.4 Apply the focus indicator class to the focused menu item; clear focus on pointer click
- [ ] 2.5 Verify touch and mouse still work alongside keyboard

## 3. Level-select grid keyboard navigation

- [ ] 3.1 Write tests: arrow keys navigate tiles (Left/Right adjacent, Up/Down between rows); Enter starts unlocked level; Enter on locked tile does nothing; first navigation focuses current level; Escape goes back
- [ ] 3.2 Add `focusedIndex` state and `useEffect` keydown listener to `LevelSelect.tsx` — Left/Right move to adjacent tile with wrapping, Up/Down use bounding-rect position to find nearest tile in target row
- [ ] 3.3 On first arrow press, focus the player's current level and scroll it into view
- [ ] 3.4 Add Enter/Space handling: start the focused level if unlocked, no-op if locked
- [ ] 3.5 Apply the focus indicator class to the focused tile; scroll into view on focus change; clear focus on pointer click
- [ ] 3.6 Verify the existing Escape handler still works alongside the new navigation

## 4. Account panel keyboard navigation

- [ ] 4.1 Write tests: arrow keys navigate between controls, wrapping; Enter activates focused control; Escape closes panel; arrow keys suppressed during username entry
- [ ] 4.2 Add `focusedIndex` state and `useEffect` keydown listener to `AccountPanel.tsx` — Up/Down move focus between rendered controls, text-input guard suppresses arrows during username entry
- [ ] 4.3 Add Escape handling to close the panel from any state
- [ ] 4.4 Reset focused index when the control list changes (anonymous → naming → registered transitions)
- [ ] 4.5 Apply the focus indicator class; clear focus on pointer click

## 5. Ball picker keyboard navigation

- [ ] 5.1 Write tests: arrow keys navigate the ball grid (Left/Right adjacent with wrapping, Up/Down between rows); Enter selects unlocked ball; Enter on locked ball does nothing
- [ ] 5.2 Add `focusedIndex` state and `useEffect` keydown listener to `BallPicker.tsx` — Left/Right with wrapping, Up/Down using the 7-column grid layout
- [ ] 5.3 Add Enter/Space handling: select focused ball if unlocked, no-op if locked
- [ ] 5.4 Apply the focus indicator class; clear focus on pointer click

## 6. Achievements screen keyboard navigation

- [ ] 6.1 Write test: Escape navigates back to main menu
- [ ] 6.2 Add `useEffect` keydown listener to `AchievementsScreen.tsx` for Escape

## 7. Integration and regression testing

- [ ] 7.1 Verify play-screen keyboard controls still work with no regression (tube navigation, shortcuts, overlays)
- [ ] 7.2 Docker rebuild and manual walkthrough: navigate main menu → level select → pick a level → play → solve → back to menu, all by keyboard
- [ ] 7.3 Test keyboard + pointer coexistence: start with keyboard, switch to mouse mid-flow, switch back
