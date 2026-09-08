## Why

Hints are currently unlimited and instant, which removes the incentive to think through a move
before asking for help. Adding a per-attempt budget and a cooldown timer makes each hint feel
valuable while still keeping the game generous — three free hints per attempt, with a fresh set
on every restart.

## What Changes

- Hints are limited to **3 per attempt** (matching the spirit of the undo budget).
- A **30-second cooldown** fills up before the hint button becomes available, so the player is
  encouraged to study the board before reaching for help.
- The cooldown begins when the level loads, when the level is reset, and after each hint is used.
- The hint button shows the remaining count and a fill-up progress indicator.
- Resetting restores the full hint budget (just as it restores undos).
- The "Hints are free" requirement in the solver spec is replaced.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `puzzle-solver`: Replace "Hints are free" with a budgeted, cooldown-gated hint system (3 hints, 30 s cooldown).
- `attempt-limits`: Add hint budget and cooldown timer alongside the existing undo budget; define reset behaviour for hint budget and cooldown.

## Impact

- **Client** — `attempt.ts` gains hint-budget state and cooldown logic; `useGame.ts` wires the
  new guards into `useHint`; `App.tsx` adds a cooldown indicator and remaining-hint badge to the
  hint button.
- **Specs** — Two existing specs receive delta updates; no new spec directories.
- **Server** — No server changes: the hint count is already recorded per completion; the budget
  and cooldown are client-only constraints, same as the undo budget.
