## Context

The game is pure click/tap — no keyboard listeners exist outside two input fields. Tubes
are already `<button>` elements with `focus-visible` styles, so they are tabbable, but
Tab-cycling through a dozen tubes is unusable in practice. The board is a flex-wrap
container of tubes in linear order; there is no grid data structure to navigate.

See proposal.md — Why for motivation.

## Goals / Non-Goals

**Goals:**

- A desktop player can complete a level from load to solved using only the keyboard.
- Keyboard and pointer input coexist; switching mid-level is seamless.
- The change is client-only and does not touch the engine, server, or conformance fixtures.

**Non-Goals:**

- Screen-reader narration or ARIA live regions (valuable, but a separate capability).
- Gamepad or controller support.
- Customisable key bindings.
- Keyboard support inside the AccountPanel overlay (it already has standard form controls).

## Decisions

### 1. Focused-tube state lives in the play-screen component, not in useGame

The "focused tube" is a UI concept — it says where the keyboard cursor is, not a game
state. It belongs alongside the `screen` state in `App.tsx`, not inside `useGame`, which
tracks the engine, the level lifecycle, and persistence. `useGame` already exposes
`tapTube(index)`, `undo()`, `useHint()`, `restart()`, and `goToLevel()` — the keyboard
handler just calls those.

*Alternative: adding focus to useGame.* Rejected because useGame would then depend on a
concept that touch and mouse users never see, and it would couple keyboard presentation
to level lifecycle for no benefit.

### 2. A single keydown listener on the play-screen wrapper

One `useEffect` in `App.tsx` registers a document-level `keydown` listener when
`screen === 'play'`. It dispatches to `tapTube`, `undo`, `useHint`, etc. based on the
key. Removed on screen change or unmount.

The listener checks `event.target` before acting: if the active element is an `<input>`
or `<textarea>`, letter-key shortcuts are suppressed so typing in the level-code field
is not hijacked. Arrow keys, Enter, and Escape are always handled because they do not
conflict with text entry in the contexts where they are used.

*Alternative: per-tube key handlers via onKeyDown on each `<button>`.* Rejected because
the game's interaction model (pick tube A, pour into tube B) is a two-step action that
spans two elements — a global listener with position state handles this naturally, while
per-element handlers would need shared coordination anyway.

### 3. Focus position is a number index, not DOM focus

The focused-tube state is a React `useState<number | null>` tracked in `App.tsx`. The
`Tube` component receives a `focused` prop and renders an indicator. This keeps the focus
model independent of DOM focus order, which can change with window resizing and flex
wrapping.

DOM `focus()` is not called on the tube buttons — the keyboard listener is document-level,
so a tube does not need DOM focus to receive keyboard input. This avoids scrolling
side-effects and keeps the visual indicator fully under React control.

When the player clicks a tube, the focused position is updated to that tube's index, so
switching from keyboard to mouse (or back) stays consistent.

### 4. Focus indicator is a ring, distinct from the selection lift

The selection indicator (existing) lifts the tube and shows a glowing dot above it. The
focus indicator uses a subtle ring around the tube — a different visual channel so the
two are distinguishable when they are on different tubes.

When a tube is both focused and selected, both indicators render. The lift is the dominant
signal (you are pouring from here); the ring is secondary (the keyboard cursor is here).

### 5. Overlay mode suppresses tube shortcuts

When `confirmingReset` or `game.solved` is true, the keydown listener enters an overlay
mode: Enter confirms/advances, Escape dismisses, and all other keys are ignored. This
prevents a stray `H` from firing a hint behind the confirmation dialog.

### 6. No new dependencies

Standard `KeyboardEvent` handling through React's `useEffect` + `addEventListener`.
Nothing beyond what the project already uses.

## Risks / Trade-offs

- **Digit keys limited to 9 tubes.** Boards can have up to 16 tubes, but the top row of
  the keyboard only goes to 9. Tubes 10+ must be reached via arrow keys. This matches the
  convention in most keyboard-driven games and covers the majority of early/mid campaign
  levels. → Accepted: adding modifier combos (Shift+0, etc.) adds complexity for little
  gain.

- **Focus position can point at an off-screen tube.** On narrow viewports where tubes
  wrap to many rows, the focused tube may be outside the visible area. → Mitigation: when
  focus moves, scroll the tube into view if it is not already visible. This is a small
  `scrollIntoView({ block: 'nearest' })` call, gated on keyboard navigation only (not on
  click, which already places the target in view).
