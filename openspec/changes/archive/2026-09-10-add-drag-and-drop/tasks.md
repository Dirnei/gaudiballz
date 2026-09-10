## 1. Drag Hook

- [x] 1.1 Create useDrag hook: tracks drag state (source tube index, pointer position, isDragging), uses pointer events, distinguishes tap from drag via movement threshold
- [x] 1.2 Write tests for useDrag: press-and-release below threshold fires onTap, movement above threshold transitions to drag mode and reports pointer position

## 2. Visual Feedback

- [x] 2.1 Create DragOverlay component: renders floating balls at pointer position during an active drag, matching the source tube's top run colours
- [x] 2.2 Add drop-target highlighting: pass a dropTarget prop to Tube that applies a visual glow when the tube is a valid pour destination during drag
- [x] 2.3 Write tests for DragOverlay rendering and drop-target highlight styling

## 3. Integration

- [x] 3.1 Wire useDrag into Tube component: add pointer event handlers alongside existing onClick, suppress click when drag threshold is exceeded
- [x] 3.2 Wire drop logic into GameScreen: on drop, identify target tube via elementFromPoint, execute pour via the engine if valid, cancel if invalid
- [x] 3.3 Compute valid drop targets during drag using validate() from the engine and pass as props to Tube components
- [x] 3.4 Add touch-action: none on the tube container during active drag to prevent browser scroll and zoom
- [x] 3.5 Clear any existing tap selection when a drag begins from a different tube
- [x] 3.6 Write integration tests: drag from tube A to valid tube B executes pour, drag to invalid target cancels, drag to empty space cancels, tap still works after drag

## 4. Verification

- [x] 4.1 Run full test suite and confirm no regressions in tap-tap or keyboard controls
- [x] 4.2 Build and test in Docker on desktop browser and mobile viewport
