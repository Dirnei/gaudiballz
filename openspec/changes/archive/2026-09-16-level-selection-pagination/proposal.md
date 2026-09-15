## Why

The level selection grid renders every tile at once, from 1 to beyond the ceiling. As
players progress past level 100, the grid becomes unwieldy — the current level is buried
at the bottom of a long scroll, and finding it means scrolling past dozens of completed
tiles every time. Pagination with descending order puts the most relevant levels front
and centre.

## What Changes

- Display levels in descending order (highest first) so the current frontier is always
  at the top of the first page.
- Split the grid into pages of 50 levels each.
- Add page navigation controls (previous / next page, page indicator).
- Default to the page containing the player's current level on first open.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `level-select`: Adding pagination (50-level pages, page controls) and descending sort
  order to the existing level grid. The tile states, selection behaviour, ceiling logic,
  and level code entry are unchanged.

## Impact

- **Client**: `LevelSelect.tsx` (grid rendering, tile range, page state, sort order),
  `LevelSelect.test.tsx` (new tests for pagination and sort).
- **Server**: No changes — the grid is computed client-side from the ceiling.
- **Dependencies**: None added.
