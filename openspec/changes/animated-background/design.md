## Context

The app has two layout components (`AppShell.tsx` and `ImmersiveLayout.tsx`) that each render an identical bloom `<div>` — a pair of blurred radial gradients (sky-blue at 25% left, purple at 75% left) that sits behind all content. Currently the bloom is static. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Animate the bloom with a slow, looping positional drift
- Keep the animation purely in CSS so it runs on the compositor thread
- Honour `prefers-reduced-motion` using the existing global reduction rule in `index.css`

**Non-Goals:**
- Animating the base gradient or any other element
- Adding particles, noise, or shader-style effects
- Per-screen animation variations — the same animation plays everywhere

## Decisions

### 1. CSS `@keyframes` on `translate` and `scale`

**Choice:** A single `@keyframes bloom-drift` rule that moves the bloom element in a slow figure-eight-like path using `translate` and a gentle scale pulse. Duration: ~20s, `infinite` loop, `ease-in-out` timing.

**Why:** `translate` and `scale` are compositor-friendly transforms — they don't trigger layout or paint, so the animation runs on the GPU thread without touching the main thread. This keeps gameplay interaction latency untouched.

**Alternative considered:** Animating `background-position` directly on the gradient. Rejected because background-position changes trigger paint on every frame, which is measurably more expensive on low-end phones.

### 2. Rely on the existing `prefers-reduced-motion` rule

**Choice:** The existing rule in `index.css` already sets `animation-duration: 0.01ms !important` for all elements when the user prefers reduced motion. No additional code needed — the bloom animation is automatically suppressed.

**Why:** Centralised handling means every animation in the app, present and future, is covered by one rule. Adding a second check would be redundant.

### 3. Extract the bloom into a shared component

**Choice:** Create a small `BackgroundBloom` component used by both `AppShell` and `ImmersiveLayout`, so the bloom markup and animation class live in one place instead of being duplicated.

**Why:** The bloom `<div>` is already copy-pasted between the two layouts. Adding an animation class to both is a good moment to deduplicate.

## Risks / Trade-offs

- **Battery on mobile:** A 20s CSS animation is lightweight, but it does keep the GPU thread active. Mitigation: the animation uses only compositor properties and a single element, so power draw is minimal — comparable to a blinking cursor.
- **Visual taste:** "Too much" or "too little" is subjective. Mitigation: the duration and distance are easy to tune in one `@keyframes` block after seeing it live.
