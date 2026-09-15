## 1. Tests

- [ ] 1.1 Add drag integration tests for hover feedback: pointer over valid target sets dropHover, pointer over invalid target does not, pointer leaving target clears dropHover, moving between valid targets transfers dropHover
- [ ] 1.2 Add Tube rendering test: dropHover prop applies the intensified highlight style distinct from dropTarget

## 2. State tracking

- [ ] 2.1 Add `dragHoverTarget` state to GameScreen: on each `onDragMove`, use `document.elementFromPoint` + `closest('[data-tube-index]')` to find the tube index under the pointer, set it when the tube is in `validDropTargets`, clear it otherwise
- [ ] 2.2 Clear `dragHoverTarget` on drag end and when drag source is cleared

## 3. Visual feedback

- [ ] 3.1 Add `dropHover` prop to Tube component (true when the tube is both a valid drop target and the one under the pointer)
- [ ] 3.2 Apply intensified highlight style when `dropHover` is true: wider ring, stronger glow, subtle scale-up — layered on top of the existing `dropTarget` style
- [ ] 3.3 Pass `dropHover` from GameScreen to each Tube based on `dragHoverTarget` state and `validDropTargets`

## 4. Verification

- [ ] 4.1 Run existing drag-and-drop tests to confirm no regressions
- [ ] 4.2 Manual test in browser: drag ball over valid targets and verify hover highlight appears/disappears, check on mobile viewport
