## Why

Players who master a particular level have no way to see how they compare on that level.
The global leaderboard ranks by total XP, which rewards breadth; a per-level leaderboard
rewards depth and gives competitive players a reason to replay and optimise individual
levels.

Today, only the best result per level is persisted — the journey to get there (how many
attempts, what hints were used, how the player improved) is lost. Event-sourcing the
completion stream preserves every attempt, which powers the leaderboard and opens the
door to richer per-level analytics later.

## What Changes

- Each level gets a leaderboard showing the top 10 registered players worldwide, ranked
  by best performance (stars, then fewest moves, then fastest time).
- The per-level leaderboard supports three time periods — all time, this week, and
  today — matching the global leaderboard's period support.
- The per-level leaderboard is visible from the gameplay screen after completing a level
  and from the level-select screen, so a player can check standings without leaving their
  current flow.
- Only registered players appear (same rule as the global leaderboard). Anonymous players
  can view the board but are not listed.
- Completion events are journaled via Akka.Persistence with full attempt detail (moves,
  hints, undos, restarts, stars, elapsed time), preserving every attempt rather than only
  the best result.
- Akka.Streams projects the event journal into materialized leaderboard views that can be
  rebuilt for any time window.

## Capabilities

### New Capabilities

- `level-leaderboard`: Per-level leaderboard showing the top 10 players worldwide for
  each level, ranked by performance, with time-period filtering. Backed by event-sourced
  completion data.

### Modified Capabilities

_(none — the global leaderboard, level progression, and scoring specs are unchanged)_

## Impact

- **Server**: New Akka.Persistence event journal for completion events, Akka.Streams
  projection into a materialized leaderboard collection, and a new API endpoint to serve
  per-level top-10 data.
- **Client**: New leaderboard UI component accessible from the game screen and
  level-select tiles. Reuses the existing profile-ball and rank-badge rendering.
  Time-period toggle matching the global leaderboard.
- **Dependencies**: Akka.Persistence.MongoDb and Akka.Streams added to the server project.
