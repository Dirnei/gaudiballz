## Why

The main menu is built for desktop-width viewports and becomes hard to navigate on mobile phones. The content area (`max-w-3xl` = 768px) with `px-6` side padding leaves elements crowding and overflowing on screens narrower than ~400px. Progress tiles, stat chips, and action buttons compete for space, making the menu feel cramped and hard to tap.

## What Changes

- Tighten side padding on narrow viewports so content gets more room without touching screen edges.
- Stack action buttons vertically on small screens so they are full-width tappable targets instead of small wrapped pills.
- Reduce progress tiles to a single column on the narrowest screens (currently 2-column even at 320px).
- Let stats ribbon chips wrap gracefully—smaller text or a horizontal scroll when the viewport cannot fit all three side by side.
- Scale down hero text size on small screens so the title does not dominate half the viewport.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `main-menu`: Adding a responsive layout requirement so the menu is usable on mobile viewports down to 320px wide.

## Impact

- `client/src/game/MainMenu.tsx` — responsive classes on the outer wrapper, hero text, and action button container.
- `client/src/game/ProgressTiles.tsx` — responsive grid breakpoint adjustment.
- `client/src/game/StatsRibbon.tsx` — responsive chip sizing or overflow handling.
- No backend changes. No new dependencies.
