## Context

The game currently starts players at Level 1 with no onboarding. The two-tap pour mechanic (tap source, tap destination) is not self-evident, especially on mobile. The existing engine (`board.ts`, `rules.ts`, `history.ts`) and rendering (`Tube.tsx`, `GameScreen.tsx`) already handle everything the tutorial needs; what is missing is a guided wrapper.

A `tutorial.ts` module already exists with the board definition, step state machine, localStorage helpers, and prompt text. Tests pass.

## Goals / Non-Goals

**Goals:**
- Teach the tap-to-select, tap-to-pour mechanic through guided play
- Reuse the existing tube rendering and game engine without modification
- Keep the tutorial entirely client-side (no server calls, no progression impact)

**Non-Goals:**
- Teaching advanced strategy (tube management, colour grouping)
- Animated hand/pointer overlays or elaborate onboarding sequences
- Letting the player replay the tutorial from settings (can be added later)

## Decisions

**Hardcoded board instead of a generated one.** The tutorial board is defined in `tutorial.ts` as a literal array. This avoids a server round-trip, keeps the tutorial offline-capable, and ensures the board is always the same trivially simple layout (2 colours, 3 tubes, capacity 3). The board passes through `createBoard()` so it is validated by the same rules as any generated board.

**Step state machine drives overlay prompts.** The tutorial has four steps: `pick-source` (waiting for first tap), `pick-target` (waiting for first pour), `free-play` (player finishes on their own), and `done`. Advancing happens on successful moves, not on taps, so a rejected tap does not skip a step. The prompts are plain text positioned above the board.

**Separate route (`/tutorial`) under `ImmersiveLayout`.** The tutorial screen lives at its own route rather than being a mode within `GameScreen`. This keeps GameScreen unchanged and lets the tutorial manage its own state (overlay steps, skip button, no level badge / timer / undo / hint controls). The route sits under `ImmersiveLayout` just like `/play`.

**`TutorialScreen.tsx` renders tubes directly.** It imports the `Tube` component and uses `play()` / `isSolved()` from the engine, but does not go through `useGame`. This avoids triggering level fetches, progression recording, attempt budgets, or solver logic. The tutorial owns its own `GameState` via `useState` + `startGame()`.

**First-time detection in `MainMenu.tsx`.** The Play button checks `needsTutorial()` and navigates to `/tutorial` instead of `/play` when true. This is a one-line change in the click handler. If `localStorage` throws (private browsing), `needsTutorial()` returns `false` and the player goes straight to Level 1.

## Risks / Trade-offs

**Risk: Tutorial board too easy to learn from.** With only 2 colours, a player might solve it by accident without understanding the mechanic. Mitigation: the guided prompts appear regardless, and the board requires at least 3 moves, which is enough to demonstrate the interaction.

**Trade-off: No server-side record of tutorial completion.** If a player clears localStorage or switches devices, they see the tutorial again. Acceptable because the tutorial is short and has a skip button, and adding server-side tracking for a non-gameplay event is not worth the complexity.
