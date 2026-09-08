## Context

Keyboard handling for the play screen lives in a single `useEffect` in `App.tsx`, guarded by `if (screen !== 'play') return`. The level-select screen has a standalone Escape handler. Main menu, account panel, ball picker, and achievements screen have no keyboard handling beyond native browser tab/enter on buttons.

## Goals / Non-Goals

**Goals:**
- Every screen navigable by keyboard with the same responsiveness as touch
- Consistent focus model: arrow keys move a visible focus indicator, Enter/Space activates
- No regression in existing play-screen keyboard behaviour

**Non-Goals:**
- Screen-reader narration or full ARIA live-region announcements (separate accessibility concern)
- Keyboard shortcut help overlay or discovery hints
- Remapping or customizing key bindings

## Decisions

### 1. Per-component keyboard handlers, not one centralized handler

Each component owns its own `useEffect` keydown listener, rather than extending the monolithic handler in `App.tsx`.

**Why:** The existing App.tsx handler is already large (130+ lines) and tightly coupled to play-screen state (focusedTube, confirmingReset, game.solved). Adding menu, grid, panel, and picker logic would double its size and create a tangle of screen-mode branches. Per-component handlers keep each screen's logic self-contained and testable.

**The App.tsx handler stays as-is** for play-screen keyboard controls. Menu components add their own listeners. The guard `if (screen !== 'play')` ensures no conflict.

**Alternative considered:** Centralizing all keyboard logic in App.tsx with screen-mode dispatch. Rejected because it couples unrelated screen states and makes individual component testing harder.

### 2. Focused-index state pattern for grid navigation

The level-select grid and ball picker both use a `focusedIndex: number | null` state that mirrors the `focusedTube` pattern from the play screen:
- Starts `null` (no focus until first keyboard interaction)
- Arrow keys move the index, wrapping at boundaries
- Grid navigation computes row/column position from the index and the number of visible columns
- The focused element gets `scrollIntoView({ block: 'nearest' })` when focus moves
- Mouse/touch clicks clear the focused index

**Why not native browser focus (tabindex):** The tile grid can have 100+ elements. Native tab-order would require tabbing through every tile. Arrow-key navigation within a single focused container is the established pattern for toolbars and grids (WAI-ARIA grid pattern) and matches how the play screen already handles tubes.

### 3. Text-input guard reused from play screen

The existing play-screen handler has an `inTextInput` check that skips shortcuts when an INPUT or TEXTAREA has focus. The menu and account panel handlers reuse the same guard: when a text input is focused (level-code entry, username input), arrow-key navigation is suppressed so the input works normally. Only Escape and Enter pass through.

### 4. Focus indicator via a shared CSS class

All screens use the same visual treatment for the keyboard focus indicator — a ring or outline matching the play-screen focus style. This is a CSS class applied conditionally when `focusedIndex !== null`, not browser-default `:focus-visible`, so it appears only on keyboard interaction and disappears on pointer use.

**Why not `:focus-visible`:** Browser focus rings vary by platform and are not styled consistently. A custom indicator controlled by component state matches the existing play-screen pattern and ensures visual consistency.

## Risks / Trade-offs

**[Grid column count is dynamic]** → The level-select grid uses `auto-fill` CSS columns, so the number of tiles per row varies with viewport width. Up/Down navigation must read the rendered layout (via `getBoundingClientRect` or computed column count) rather than assuming a fixed column count. The play screen already does this for tube rows with `findVerticalNeighbour`, so the pattern is proven.

**[Account panel content varies by auth state]** → The panel shows different controls when anonymous vs registered vs in naming mode. The focused-index approach naturally handles this: the index resets when the control list changes, and the list is rebuilt from whatever controls are currently rendered.

**[Achievements screen may grow interactive elements]** → Currently achievement cards are display-only, so only Escape is needed. If cards become interactive later (e.g., share, expand), the keyboard spec will need extending. This is acceptable since it is a separate future concern.
