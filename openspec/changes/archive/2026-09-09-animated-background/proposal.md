## Why

The background is a static dark gradient with two colour blooms (sky-blue and purple) that give it depth. A subtle, slow animation on the blooms would make the background feel alive and polished without competing with gameplay — the kind of detail that registers as atmosphere rather than distraction.

## What Changes

- Animate the two colour bloom elements with a slow, looping drift so their positions shift gently over time.
- The animation must respect `prefers-reduced-motion` and stop entirely when the user has asked for less motion.
- Driven by CSS keyframes, not JavaScript timers, to stay off the main thread and avoid interfering with game interaction performance.

## Capabilities

### New Capabilities
- `animated-background`: Defines the observable behaviour of the background animation — that it moves, that it loops, and that it honours the reduced-motion preference.

### Modified Capabilities

## Impact

- **client/src/game/AppShell.tsx**: The bloom `<div>` gains a CSS animation class.
- **client/src/game/ImmersiveLayout.tsx**: Same bloom animation applied for consistency.
- **client/src/index.css**: New `@keyframes` rule for the bloom drift.
- No new dependencies. No backend changes. No bundle size impact beyond a few lines of CSS.
