## Context

The app is a single-component React app (`App.tsx`) with no router. All UI states are conditional overlays on top of the always-rendered board. State lives in a single `useGame` hook. The visual style is dark/glassy with Tailwind v4 utility classes and `motion/react` for transitions.

The server already returns per-level completion data from `GET /api/v1/progress` — the `levels` array contains `{ level, moves, hints }` for every completed level. No new backend endpoint is needed.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Introduce a screen-switching mechanism that separates main menu, level select, and gameplay into distinct views.
- Keep the architecture simple — no routing library, just a state-driven view switch.
- Match the existing dark glass visual style for new screens.
- Preserve all existing gameplay behavior, including board state when navigating away and back.

**Non-Goals:**
- URL-based routing or deep links to specific screens (can be added later if needed).
- Chapter grouping or pagination in the level grid — a flat scrollable grid is sufficient.
- Redesigning the gameplay screen layout or the account panel beyond removing the code entry section.
- Changing any server-side behavior — the existing API already provides everything needed.

## Decisions

### 1. Screen switching via a state enum, not a router

A `screen` state variable in `App.tsx` (or a thin `useScreen` hook) drives which view renders: `'menu' | 'levels' | 'play'`. `AnimatePresence` handles enter/exit transitions between screens, matching the existing overlay transition style.

**Why not react-router:** The app has no URLs to match, no back-button history to manage (the browser back button on a game is more annoying than useful), and no code-splitting benefit since all three screens share the same bundle. A router would add a dependency and complexity for zero user benefit.

**Alternative considered:** Keeping the single-view approach and making the menu an overlay. Rejected because the menu and level select are full screens, not modal overlays — they replace the gameplay view rather than floating above it.

### 2. `useGame` hook stays, gains a `progress` map

The `useGame` hook already fetches progress from the server on mount (to compute the ceiling). The `ProgressSnapshot` response already includes the per-level `levels` array. Expose this as a `Map<number, { moves: number; hints: number }>` on the hook's return value so `LevelSelect` can render tiles without a separate fetch.

**Why a map:** Tile rendering needs O(1) lookup per level number. The server returns an array; converting it to a Map once on load is cheap.

### 3. MainMenu and LevelSelect as separate component files

Two new files: `client/src/game/MainMenu.tsx` and `client/src/game/LevelSelect.tsx`. They receive callbacks from `App.tsx` (e.g. `onPlay`, `onSelectLevel`, `onBack`) and read progress/ceiling from props or the `useGame` hook.

**Why separate files:** `App.tsx` is already ~450 lines. Adding two full screens inline would make it unwieldy. The pattern matches `AccountPanel.tsx` and `Tube.tsx` as peer components.

### 4. Level grid layout

The level select grid uses CSS grid with `auto-fill` columns, each tile a fixed-size square. Completed tiles show a checkmark or the best move count. Locked tiles are dimmed/faded. The current level tile has a highlight ring.

Tile count: levels 1 through `ceiling + some locked preview` (showing a few locked tiles gives the player a sense of what's ahead). The grid scrolls vertically. On mobile the tiles are smaller (3-4 per row); on desktop they can be larger (6-8 per row).

### 5. Board state preservation

When the player navigates to the menu and back, the `useGame` hook is not unmounted — the screen switch renders different components but `useGame` remains mounted at the `App` level. This preserves `board`, `history`, `moves`, and all in-progress state for free, with no serialisation needed.

### 6. Level code entry moves to MainMenu, removed from AccountPanel

The `enteringCode` state, the input, and the `handleCodeUnlock` handler move from `AccountPanel.tsx` into `MainMenu.tsx`. The `AccountPanel` keeps only identity management (login, register, logout). The button styles (`primary`, `quiet`) and glass visual treatment are reused.

### 7. The gameplay header gains a back/home button

A small icon button (house or back arrow) in the header left of the `LevelBadge`, matching the existing `IconButton` component style. Tapping it sets the screen to `'menu'`.

## Risks / Trade-offs

- **Risk:** Adding a menu screen adds one tap before gameplay for returning players.  
  → Mitigation: "Play" is the most prominent button. Consider storing `screen` in localStorage so a returning player who always taps Play could be taken straight to gameplay in a future iteration, but for now a consistent menu-first experience is simpler.

- **Risk:** The level grid could feel sparse for a new player (only level 1 unlocked).  
  → Mitigation: Show a handful of locked tiles as preview. The grid still communicates "there's more to unlock" even with minimal progress.

- **Risk:** Mounting all screens behind `AnimatePresence` keeps `useGame` and its effects always alive, including the server fetch on mount.  
  → This is the current behavior already (the game fetches on mount today). No regression.
