# Proposal

## Why

When a player finishes a level with fewer than 3 stars, the win screen shows the empty stars but
not why they were missed. The numbers are there (moves, par, time, time target), but the player
has to work out the star rule themselves, so a replay has no clear goal. Saying "2 moves over
par" or "4.2s over the time target" turns a missed star into a target to beat.

## What Changes

- The campaign win screen and the daily challenge solved overlay show a short line for each
  reason the attempt missed 3 stars: hints used, moves over par (with how many), and time over
  the target (with how much).
- Nothing is shown for a 3-star attempt.
- Scoring itself does not change: the star rule, points and bonuses stay exactly as they are.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `level-scoring`: adds a requirement that the win screen explains every condition the attempt
  missed for 3 stars.

## Impact

- Client only: `GameScreen.tsx` and `DailyScreen.tsx` solved overlays, a small pure helper that
  works out the missed conditions, and new `en`/`de` translation strings.
- No server, API, conformance fixture or scoring change.
