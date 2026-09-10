## Context

The game uses a two-tap interaction model: tap a source tube to select it (lifts the top run), then tap a destination to pour. This is implemented in `useGame.ts` via the `tapTube` callback and rendered in `GameScreen.tsx` with the `Tube` component. The `Tube` component is a `<button>` with an `onClick` handler.

Keyboard controls use a separate event system (`keydown` listener in `GameScreen`) that calls the same `tapTube` function. Both input paths converge on the engine's `play()` function.

## Goals / Non-Goals

**Goals:**
- Add drag-and-drop as an optional shortcut that coexists with tap-tap
- Provide visual feedback: floating balls at the pointer, highlighted valid targets
- Work with both mouse and touch using a single event model
- Keep the implementation contained to the game screen layer (no engine changes)

**Non-Goals:**
- Replacing tap-tap (it remains the primary method and the only one the tutorial teaches)
- Drag animations with physics (spring, momentum) — the balls snap to the pointer
- Drag between tubes that require scrolling to reach (the board does not scroll)
- Adding a user setting to disable drag-and-drop

## Decisions

**Pointer Events for unified input.** Use `pointerdown`, `pointermove`, and `pointerup` instead of separate mouse and touch handlers. Pointer events unify mouse, touch, and pen under one API, are supported in all target browsers, and integrate with `setPointerCapture` to keep tracking the pointer even if it leaves the tube element.

**Movement threshold to distinguish tap from drag.** A threshold of ~8 CSS pixels separates a tap (below) from a drag (above). On `pointerdown`, record the starting position. On `pointermove`, if the cumulative distance exceeds the threshold, transition into drag mode. If `pointerup` fires before the threshold is reached, fire the existing `onTap` handler. This avoids a timing-based long-press detector, which adds latency to taps.

**Drag overlay rendered as a portal.** The floating balls during a drag are rendered in a fixed-position overlay above the game board, not as a child of the source tube. This prevents clipping by tube overflow and ensures the balls visually sit above everything. The overlay receives the pointer position via state and renders cloned ball visuals matching the top run's colours.

**Drop target detection via element hit testing.** On `pointerup`, use `document.elementFromPoint(x, y)` to find which tube (if any) the pointer is over. Each tube carries a data attribute with its index so the drop handler can identify the target. This is simpler than tracking bounding rects for all tubes and handles layout changes automatically.

**Valid targets computed from the engine's `validate()`.** During an active drag, iterate all tubes and call `validate(board, { from: sourceIndex, to: i })` to determine which are valid pour destinations. This reuses the authoritative rules logic. The result is passed to `Tube` as a `dropTarget` prop that drives the highlight style.

**`touch-action: none` during drag.** Set `touch-action: none` on the tube container (or via `setPointerCapture`) when a drag begins to prevent the browser from interpreting the gesture as a scroll or pinch-zoom. Restore default behaviour when the drag ends.

**Existing `onClick` remains.** The `Tube` component keeps its `onClick` handler. Pointer event handlers are added alongside it. When a gesture is classified as a drag (threshold exceeded), `preventDefault()` on the pointer events suppresses the subsequent `click` event so both paths do not fire.

## Risks / Trade-offs

**Risk: Accidental drags on mobile.** Fat fingers on small tubes may cross the threshold unintentionally. Mitigation: the 8px threshold is generous for touch (about 2mm at typical densities). If a drag begins accidentally, dropping on empty space or an invalid target cancels it harmlessly.

**Risk: Pointer capture and Motion library interaction.** The `Tube` component uses Motion (Framer Motion) for animations. Pointer capture and Motion's gesture handlers could conflict. Mitigation: pointer events are attached to the tube's outer button, not to the Motion-animated inner container, so they operate at a higher level.

**Trade-off: No haptic feedback during drag.** The tap path fires `haptics.move()` on pour. Drag could fire the same on drop, but there is no haptic signal during the drag itself. Acceptable because continuous haptics during drag would be distracting on most devices.
