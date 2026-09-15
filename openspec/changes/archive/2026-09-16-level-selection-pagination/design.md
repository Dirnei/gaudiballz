## Context

The level selection grid in `LevelSelect.tsx` currently renders every tile from 1 to
`totalTiles` (ceiling rounded up + a buffer) in a single flat list. The tile range,
tile state classification, star display, keyboard navigation, and level code entry
all live in this one component. See proposal.md for motivation.

No server API is involved — the grid is computed client-side from `levelCeiling` and
`levelProgress` provided by `GameContext`.

## Goals / Non-Goals

**Goals:**

- Paginate the grid into 50-level pages with descending sort.
- Open on the page containing the current level.
- Keep keyboard navigation working within a page.

**Non-Goals:**

- Server-side pagination or a level-listing API (the grid stays client-side).
- Infinite scroll or virtual scrolling (50 tiles per page is light enough for DOM).
- Persisting the last-viewed page across sessions.

## Decisions

### 1. Client-side pagination only

The grid is derived from a single integer (ceiling) and a progress map the client
already holds. Adding a server endpoint would add latency and complexity for no
benefit. Pagination is a view concern over data the client already owns.

*Alternative*: Server-side paginated endpoint — rejected because the server does not
store a level list (levels are generated on demand by ID).

### 2. Page size of 50, not configurable

50 is the requested page size. Making it configurable adds UI and state for a setting
nobody will change in a single-player puzzle game.

### 3. Descending sort with page 1 = highest levels

The highest levels are the most relevant to an active player. Descending order puts
the frontier at the top of page 1, eliminating the scroll that motivated the change.

Tile range per page: the full displayable range is computed as today (ceiling + buffer,
rounded), then sliced into descending pages. Page 1 holds the top 50, page 2 the next
50, and so on. The last page holds whatever remains (may be fewer than 50).

### 4. Page state is local component state

Page index is `useState` inside `LevelSelect`. It resets on mount (opening the screen
always starts on the page containing the current level). No URL parameter, no context,
no persistence — it is ephemeral view state.

### 5. Keyboard navigation stays within the page

Arrow keys move within the visible page. Page boundaries are navigated via the page
controls, not by arrowing past the last tile. This keeps the existing keyboard model
intact without cross-page focus complexity.

## Risks / Trade-offs

- **Descending order is unfamiliar**: Most level-select grids go 1→N. Players at
  high levels benefit, but a new player on level 3 sees a single short page with tiles
  in 5-4-3-2-1 order. → Acceptable: the page is small and tiles are clearly numbered.
  The win for active players (not scrolling past 100+ completed tiles) outweighs
  the minor novelty for new players.

- **Page controls add touch targets on mobile**: The grid already has a level-code
  input below it. Page controls add a second non-tile interaction area. → Keep them
  minimal (two arrows + a page indicator), placed above or below the grid in the
  existing layout flow.
