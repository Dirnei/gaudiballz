## 1. Focus indicator on tubes

- [x] 1.1 Add a `focused` prop to the `Tube` component and render a ring indicator (visually distinct from the selection lift) when `focused` is true
- [x] 1.2 Verify that focus and selection indicators render correctly together when a tube is both focused and selected

## 2. Focused-tube state and arrow-key navigation

- [x] 2.1 Add `focusedTube: number | null` state in `App.tsx` for the play screen, initialised to `null` on level load and screen entry
- [x] 2.2 Register a document-level `keydown` listener (via `useEffect`) when `screen === 'play'`; clean up on screen change or unmount
- [x] 2.3 Handle Left/Right arrow keys to move `focusedTube` through the tube list with wrapping; on first press when `focusedTube` is `null`, set it to tube 0
- [x] 2.4 Pass `focused={focusedTube === index}` to each `Tube` in the board loop
- [x] 2.5 When keyboard focus moves, scroll the focused tube into view with `scrollIntoView({ block: 'nearest' })`

## 3. Tube selection and pouring via keyboard

- [x] 3.1 Handle Enter and Space in the keydown listener: call `game.tapTube(focusedTube)` on the focused tube (with haptics), guarded by `focusedTube !== null`; call `preventDefault()` to stop Space from scrolling
- [x] 3.2 Handle digit keys 1–9: map to tube index `digit - 1`, ignore if index is out of range, call `game.tapTube(index)`, and set `focusedTube` to that index
- [x] 3.3 When the player clicks/taps a tube, update `focusedTube` to that tube's index so pointer and keyboard stay in sync

## 4. Toolbar shortcuts

- [x] 4.1 Handle U key: call `game.undo()` when `game.canUndo` is true
- [x] 4.2 Handle H key: call `game.useHint()` (with haptics) when the hint button would be enabled (not stuck, not solved)
- [x] 4.3 Handle R key: open the restart confirmation dialog (`setConfirmingReset(true)`)
- [x] 4.4 Handle N key: call `game.goToLevel(game.levelId + 1)` when below the level ceiling
- [x] 4.5 Handle P key: call `game.goToLevel(game.levelId - 1)` when above level 1

## 5. Escape key behaviour

- [x] 5.1 Handle Escape in the play-screen keydown listener with the priority chain: (1) deselect a picked-up tube, (2) dismiss an open overlay, (3) navigate back to menu
- [x] 5.2 Add an Escape handler on the level-select screen to navigate back to the main menu

## 6. Overlay keyboard interaction

- [x] 6.1 When `confirmingReset` is true, intercept Enter (confirm restart) and Escape (dismiss) before any tube or toolbar shortcut
- [x] 6.2 When `game.solved` is true, intercept Enter (next level) and Escape (dismiss overlay) before any tube or toolbar shortcut

## 7. Input guard

- [x] 7.1 Skip letter-key and digit-key shortcuts when `document.activeElement` is an `<input>` or `<textarea>`, so typing in the level-code field or username field is not hijacked

## 8. Verification

- [x] 8.1 Build the Docker image and play through a level using only the keyboard in the browser: arrow keys to navigate, Enter/Space to select and pour, U to undo, H to hint, R to restart, N/P to change levels, Escape to deselect and navigate back
- [x] 8.2 Confirm pointer input still works exactly as before during and after keyboard use
- [x] 8.3 Confirm typing in the level-code field on the main menu does not trigger toolbar shortcuts
