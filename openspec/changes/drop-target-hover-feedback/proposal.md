## Why

During drag-and-drop, valid drop targets are highlighted with a static glow, but there is no additional feedback when the pointer is directly over one of those targets. Players cannot tell whether releasing at their current position will drop or cancel, making the gesture feel imprecise—especially on mobile where fingers obscure the tube.

## What Changes

- Add a "hover" visual state to tubes: when the pointer is over a valid drop target during a drag, that tube intensifies its highlight (brighter glow, slight scale-up, or similar) so the player knows a release will land.
- Track the tube currently under the pointer during drag and expose it to the rendering layer.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `drag-and-drop`: Adding a new requirement for hover-state feedback on the tube directly under the pointer during a drag.

## Impact

- `client/src/game/GameScreen.tsx` — compute which tube the pointer is currently over during drag move events and pass it down.
- `client/src/game/Tube.tsx` — add a `dropHover` visual treatment distinct from the existing `dropTarget` highlight.
- `client/src/game/useDrag.ts` — no changes expected; pointer position is already reported via `onDragMove`.
- No backend changes. No conformance impact (visual only, no rule change).
