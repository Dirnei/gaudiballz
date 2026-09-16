## Context

Drag-and-drop already tracks the pointer position on every move (`onDragMove`) and computes the set of valid drop targets (`validDropTargets`). The drop logic in `onDragEnd` uses `document.elementFromPoint` to find the tube under the pointer at release time. The gap is that during the drag no individual tube knows whether the pointer is over it—only whether it is a valid target in general.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Give players real-time confirmation that releasing will land the pour on the tube they are aiming at.
- Keep the cost negligible: hit-testing a handful of tube elements per pointer move is trivially fast.

**Non-Goals:**
- Animating the balls "previewing" into the target tube. That implies a speculative board state and is out of scope.
- Changing the existing static drop-target glow. It stays; the hover state layers on top of it.

## Decisions

### Hit-test on every drag move to find the hovered tube

On each `onDragMove`, use the same `document.elementFromPoint` + `closest('[data-tube-index]')` lookup already used in `onDragEnd`. Store the resulting tube index (or null) as `dragHoverTarget` state in `GameScreen`. Pass it to `Tube` as a `dropHover` prop (true only when that tube is both a valid drop target and the one under the pointer).

**Why not CSS `:hover`?** Pointer capture is set on the source element, so CSS `:hover` fires only on the captured element, not on whatever is geometrically under the pointer. The explicit `elementFromPoint` approach already works for the drop and costs nothing extra during the move.

### Visual treatment: brighter glow + subtle scale

The hover state uses a green ring and glow (`rgba(74,222,128)`) with a small `scale(1.04)` on the tube body, distinct from the sky-blue drop-target ring. This makes the hovered target immediately obvious even among multiple highlighted tubes.

**Why green?** Blue already means "valid target". Adding a second colour for "valid and aimed at" gives a stronger signal than intensity alone, especially on mobile where fingers obscure the tube.

## Risks / Trade-offs

- **Pointer capture obscures geometry**: `elementFromPoint` during pointer capture returns the captured element unless `pointer-events: none` is set on the overlay. The `DragOverlay` already has `pointer-events-none`, so this works. If a future change adds pointer-interactive drag chrome, the hit-test will break—document this assumption.
- **Performance on high-frequency moves**: `elementFromPoint` is synchronous and fast for a board of ~15 tubes. No throttling needed. If boards ever reach hundreds of elements, throttle to every other frame.
