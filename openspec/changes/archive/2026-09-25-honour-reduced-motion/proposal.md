# Proposal

## Why

Some players turn on "reduce motion" in their operating system because sliding, bouncing and
zooming make them feel unwell or distract them. The game only half honours it. A blanket CSS rule
stops CSS animations, but every animation driven by the animation library ignores the setting:
screens and dialogs sliding in, flasks lifting when picked up, balls dropping, the pop when a
flask fills, and the solved card springing in. That same CSS rule also breaks the hint cooldown
ring, which jumps straight to full. It looks like the hint is ready while you're still waiting.

Worse, on desktop that rule turns the background into a strobe. It shortens the background's
endless drift to 0.01 ms per cycle but leaves it repeating forever, so the blurred colour blobs
jump to a new place and size every frame. For players who turned on reduced motion because
motion affects them, that is the opposite of what they asked for, and flashing like that is a
real risk for photosensitive players.

## What Changes

- With reduced motion on, nothing moves, grows or bounces: screens, dialogs, menus and toasts
  appear and disappear in place (a short fade is allowed), flasks don't lift when picked up,
  balls appear in their slot instead of dropping in, and a completed flask doesn't pulse.
- Nothing that tells the player something is lost. Selection, completed flasks, the solved card,
  toasts and the sound menu are all still shown, just without the movement.
- The hint cooldown ring keeps filling over the wait, because it shows how long is left, not
  decoration. This fixes the ring jumping to full.
- The game follows the setting live, without a reload.
- Nothing flashes or loops under reduced motion. The background stands still, as the
  `animated-background` spec already requires, instead of strobing.
- Unchanged: the shared-result replay already steps instead of animating (`shared-result-page`).

## Capabilities

### New Capabilities

- `reduced-motion`: how the whole game behaves when the player's system asks for reduced motion.

### Modified Capabilities

_None._ The background and the replay already have their own reduced-motion requirements. This
change makes the background actually meet its requirement, without changing what it says.

## Impact

- Client only: one wrapper at the app root that tells the animation library to follow the
  system setting, a repeat limit and a narrow exception for the hint cooldown ring in `index.css`,
  and tests.
- No server, rules-engine or conformance change.
