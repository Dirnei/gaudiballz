## Why

The BackgroundBloom effect runs a continuous CSS animation with a 72px Gaussian blur and GPU-promoted layer on every device. On mobile phones this causes substantial battery drain — a full-viewport blur composited at ~60fps is one of the most expensive single effects the game runs. Mobile users report noticeable battery impact during play sessions.

## What Changes

- Disable the bloom animation, blur filter, and GPU hints (`will-change`, `contain: strict`) on touch/mobile devices
- Keep the static radial gradient visible on mobile so the screen retains its colour wash
- Desktop devices with a pointer (mouse/trackpad) continue to see the full animated bloom unchanged
- Use a CSS media query (`pointer: fine`) to gate the expensive effects, not JavaScript device detection

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `animated-background`: Add a requirement that the bloom animation and blur are disabled on mobile/touch devices to conserve battery, while the static gradient remains visible

## Impact

- `client/src/game/BackgroundBloom.tsx` — conditional classes for blur and a CSS class for animation
- `client/src/index.css` — media-gated animation rule and removal of inline style animation
