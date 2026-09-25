# Design

## Context

There are two kinds of animation in the client:

- **CSS**: the background drift, the hint cooldown ring (`@keyframes hint-cooldown`) and Tailwind
  `transition-*` classes. `index.css` already has a blanket
  `@media (prefers-reduced-motion: reduce)` rule that sets every `animation-duration` and
  `transition-duration` to `0.01ms !important`. That rule is also why the cooldown ring jumps
  straight to its end state under reduced motion: its `forwards` fill lands on "full" at once.
  The rule also left `animation-iteration-count` alone, so the background's infinite
  `bloom-drift` ran at 0.01 ms per cycle, thousands of cycles a second, and landed somewhere
  random every frame. On desktop (the drift only runs with a fine pointer) that made a full-screen
  strobe. Measured in Chromium with reduced motion emulated: `bloom-drift 0.01ms x Infinity,
  running`, and 9 of 12 screenshots 40 ms apart differed.
- **Motion (`motion/react`)**: 18 components, covering screen transitions, overlays, dialogs,
  toasts, `whileTap` scale feedback, the tube lift and the ball enter/exit springs in `Tube`,
  `BoardPreview` and `DragOverlay`. None of them read the setting, except the shared-result replay
  (`useReplay`), which steps instead of auto-playing.

## Goals / Non-Goals

**Goals:**
- One switch for every Motion animation, so no component is forgotten now or later.
- The cooldown ring works correctly under reduced motion.

**Non-Goals:**
- An in-game "reduce motion" setting separate from the system one. The system setting is the
  standard, and players who need it have already set it.
- Changing the background or the replay, which already comply.

## Decisions

**`<MotionConfig reducedMotion="user">` at the app root.** Motion's own global switch: while the
system asks for reduced motion, it skips transform and layout animations (x/y/scale/rotate, which
is every slide, spring, lift and pop here) and keeps opacity and colour, which is exactly the
"may fade" the spec allows. It listens to the media query, so it follows the setting live. It is
the element of a new root route (`MotionRoot`, a `MotionConfig` around an `<Outlet />`) that every
other route hangs under. A root route rather than a wrapper around `<RouterProvider>` in `App`,
because the tests render `routes` directly; this way every screen in the app and in the tests
sits inside it.
- *Alternative*: `useReducedMotion()` in each of the 18 components. Rejected: every new animation
  would have to remember it, and forgetting is how the game got here.

**Dragging is untouched.** `DragOverlay` positions the dragged balls by setting a style from
pointer coordinates, not through a Motion animation, so it keeps following the pointer. The
spring on its balls appearing is a transform and is skipped.

**The blanket rule also stops repeats.** It gains `animation-iteration-count: 1 !important`,
the standard companion to the 0.01 ms duration: every CSS animation now plays once, instantly,
and rests on its final frame. `bloom-drift`'s final frame is its first, so the background simply
stands still. This fixes the strobe at its source, the rule, rather than special-casing the
background, so no later infinite animation can strobe either.

**The cooldown ring is exempt from the blanket CSS rule.** It gets a class, `.cooldown-ring`, and
`index.css` restores its real duration inside the reduced-motion media query:
`.cooldown-ring { animation-duration: var(--cooldown-duration) !important; }`. The class selector
is more specific than `*`, so it wins between two `!important` declarations. `CooldownSweep`
already sets its duration inline; it also sets `--cooldown-duration` so the stylesheet can restore
it. The ring's stroke drawing round is a progress bar, not movement across the screen, so it is
the kind of essential motion reduced-motion guidance allows.

**Tube lift.** `Tube` animates `y: selected ? -6 : 0`. Under `MotionConfig` the lift is skipped,
and selection stays visible through the glowing bar above the tube and `aria-pressed`. No change
to `Tube` is needed.

No server, Akka or determinism concerns.

## Risks / Trade-offs

- [A future animation built without Motion (hand-written CSS keyframes) slips past] → the blanket
  CSS rule still stops it. Only an informational animation needs an exemption like the ring's.
- [The stylesheet rule could be edited back] → a test reads `index.css` and requires both the
  0.01 ms duration and the single iteration in the reduced-motion block, and the flashing check
  is repeated in a real browser before this change is archived.
- [jsdom can't show whether motion happened] → tests check that the app root provides
  `reducedMotion: "user"` (read through Motion's config context from a probe component). The ring
  exemption is a CSS rule, checked with a test that the ring carries the class and the
  `--cooldown-duration` property. How it actually looks is checked by hand with the OS setting on.
