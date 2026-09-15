## Context

The `BackgroundBloom` component renders a full-viewport div with `blur-3xl` (72px Gaussian blur), `will-change: transform`, `contain: strict`, and an infinite `bloom-drift` CSS animation. All of this runs unconditionally on every device. See proposal.md for why this is a battery problem on mobile.

## Goals / Non-Goals

**Goals:**

- Eliminate the bloom's battery cost on mobile by removing blur, animation, and GPU hints
- Keep the static gradient visible so mobile screens don't look flat
- Zero behaviour change on desktop

**Non-Goals:**

- Reducing blur radius as a compromise (we remove it entirely on mobile)
- JavaScript-based device detection or runtime feature flags
- Changing the bloom appearance on desktop
- Addressing other battery drains (timers, heartbeat, backdrop-blur on overlays)

## Decisions

**Choice:** Use `@media (pointer: fine)` to gate the animation and blur, not a Tailwind breakpoint like `md:`.

A width breakpoint (`md:blur-3xl`) misclassifies tablets and large-screen phones as desktop. `pointer: fine` targets the actual input type — devices with a mouse get the animation, touch devices don't. This matches the real cost boundary: phones and tablets are the ones with battery constraints.

**Alternative considered:** `hover: hover` — similar intent but less precise; some touch devices report hover support. `pointer: fine` is the more direct signal.

**Choice:** Move animation from an inline `style` to a CSS class gated by the media query.

The current component sets `animation`, `willChange`, and `contain` as inline styles, which can't be overridden by media queries without `!important`. Moving them to a CSS class (`.bloom-animate`) applied only inside `@media (pointer: fine)` keeps the cascade clean.

**Choice:** Use Tailwind's responsive `blur-none` / `blur-3xl` pattern for the blur.

Tailwind's `@media (pointer: fine)` support requires a custom screen or raw CSS. Since we already need a `.bloom-animate` class in `index.css`, we gate the blur there too for consistency. Both the blur and animation live in the same media block.

## Risks / Trade-offs

- **Hybrid devices** (e.g. Surface with touch + mouse): `pointer: fine` reports the primary pointer. A Surface with a mouse attached gets the animation; in tablet mode without a mouse it does not. This is the right default — if they have a mouse they're likely plugged in.
- **Visual difference between devices**: Mobile users see a simpler, static background. This is intentional and barely noticeable — the gradient colour wash is the main visual contribution, not the drift.
