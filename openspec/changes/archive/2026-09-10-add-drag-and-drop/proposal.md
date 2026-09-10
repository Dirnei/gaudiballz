## Why

The game's two-tap mechanic (tap source, tap destination) works well but feels indirect to players accustomed to drag-and-drop in similar puzzle games. Adding drag-and-drop as a parallel input method makes the interaction feel more physical and intuitive, especially on desktop where mouse dragging is the expected gesture, while keeping the reliable tap-tap path for mobile and accessibility.

## What Changes

- Add drag-and-drop as an additional input method: press and drag from a source tube, release over a destination tube to pour
- Show a visual indicator during drag: the top run of balls follows the pointer or finger
- Highlight valid drop targets while dragging so the player knows where they can pour
- Distinguish tap from drag using a movement threshold so short taps continue to work as before
- Support both mouse and touch input for drag gestures
- The existing tap-tap mechanic remains unchanged and fully functional

## Capabilities

### New Capabilities

- `drag-and-drop`: Drag-and-drop input method for pouring balls between tubes, coexisting with the tap-tap mechanic

### Modified Capabilities

(none — existing input methods and rules are unchanged)

## Impact

- Modified files: `Tube.tsx` (pointer event handlers), `GameScreen.tsx` (drag state and drop logic)
- New files: drag hook (pointer event tracking and threshold logic), drag overlay component (floating balls visual)
- No server changes, no API changes, no rule changes
- No changes to keyboard controls or conformance fixtures
