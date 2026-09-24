# Design

## Context

See proposal.md for the why and specs/games-played-activity/spec.md for the behaviour.

Today:
- `daily_play` (`DailyPlayDocument`, one row per player per UTC day) is only ever written by
  `PuzzleStore.RecordDailyPlayAsync`. That is called on a campaign completion
  (`AchievementActors`) and on a daily completion (`DailySlice`). It has a single counter,
  `CompletionCount`.
- Readers of `daily_play`:
  - games-played figures (`HubSlice` community-stats and player stats): sum of `CompletionCount`
  - "solved today" (`CountSolvedTodayAsync`): sum of `CompletionCount`
  - "active this week" (`CountActivePlayersThisWeekAsync`): **existence** of a row
  - streaks (`HubSlice.CalculateStreak/BestStreak`, `AchievementCatalogue.CurrentStreak`,
    `HasFullWeek`): **existence** of a row
  - streak bonus (`PuzzleStore` ~line 280): `dailyDoc is null`
- Campaign attempts are reported only when they end (`/progress/attempts/end`, restarted or
  abandoned) or by a completion. Daily attempts are never reported.
- In the client, `useGame` marks an attempt open on its first move (`beginAttempt` →
  `attemptOpen`, passed as `onMove` to `useBoardPlay`). `useDailyGame` has no attempt concept.

## Goals / Non-Goals

**Goals:**
- Games played counts starts, in both modes, with no change to anything completion-based.
- Old days keep their numbers without a migration.

**Non-Goals:**
- Changing win rate, the stats-page games-played card, or `attempt-outcomes`.
- Warning players before they leave the daily challenge. Daily has no win rate, so leaving
  loses nothing that needs a warning.
- Deduplicating a start reported twice.

## Decisions

### 1. Count at start, not at end

The client reports a start once per attempt, on the first move.

- **Why:** this matches "a game counts when it starts" directly. A single report per game
  replaces three end paths (completion, restart, abandon), and the abandon path is a best-effort
  beacon from a closing tab. A start is sent while the player is actively playing, so it is the
  most reliable moment to report.
- **Alternative rejected:** summing completions plus end reports. That depends on the
  best-effort beacon. It would also need daily to gain restart and abandon reporting, and it
  still misses a tab that crashes.

### 2. Starts live in their own collection

A new `game_starts` collection holds one document per player per UTC day
(`"{playerId}#{yyyy-MM-dd}"`) with an `$inc` counter `Starts`, upserted like `daily_play`.

- **Why:** every streak, active-this-week and streak-bonus check reads the *existence* of a
  `daily_play` row. Writing starts there would make a restart-only day look like a played
  day. A separate collection leaves all of those untouched, so no reader needs an audit.
- **Alternative rejected:** adding a `StartCount` field to `daily_play` and filtering on
  `CompletionCount > 0` in six places. That is easy to miss one of, and a later reader could
  reintroduce the bug.

### 3. Reading games played: starts, falling back to completions per day

- **Per player and day:** if a `game_starts` row exists, games = `Starts`. Otherwise games =
  `daily_play.CompletionCount`.
- **Community per day:** if any start was recorded that day, games = the sum of `Starts`.
  Otherwise games = the sum of `CompletionCount`.
- Week, month and all-time totals are sums over those per-day values.
- This keeps pre-change days as they were (spec: "Earlier days keep their recorded counts")
  and switches each day over as soon as starts exist for it.
- The ship day itself undercounts slightly: completions from before the deploy that day are
  not counted as starts. This is accepted and matches `attempt-outcomes`, "Counting begins
  when the feature ships".
- One store method, `GetGamesPlayedByDayAsync(playerId?, days)`, returns the merged
  per-day map. `HubSlice` community-stats and player stats both use it instead of summing
  `CompletionCount`.

### 4. Endpoint

`POST /api/v1/progress/attempts/start` with body `{ mode: "campaign" | "daily" }` and the usual
bearer token.

- It increments today's `game_starts` row for the player and returns 204.
- It returns 401 without a valid token, and 400 for an unknown mode.
- No attempt id is needed, since nothing is deduplicated (non-goal). `mode` is validated but
  not stored today. It is kept so a later change can split the figures by mode without a
  client change.
- The community-stats output cache (30 s) stays as it is.

### 5. Client

- `progress.ts` gains `reportGameStarted(mode)`: a `fetch` with `keepalive`, best-effort,
  errors swallowed. It follows the pattern of `reportAttemptEnded`.
- **Campaign:** `useGame` calls it when `attemptOpen` turns from false to true, which happens
  on the first move of every attempt, including the first move after a restart. It is not
  called on every move.
- **Daily:** `useDailyGame` gains the same "open on first move" flag. It is reset when the
  puzzle loads and on restart, and passed as `onMove`. It reports `'daily'` on the transition.
- An offline start is lost, not queued. It is only a counter, and queuing it would pull it
  into the completion queue's ordering guarantees for no benefit.

## Risks / Trade-offs

- [A start report is lost offline or on a failed request] → The game goes uncounted. This is
  best-effort by design, and a one-game undercount is a better failure than a queue.
- [Double reporting from a client bug] → Guarded by the false→true transition. A hook test
  checks exactly one report per attempt, and one more after a restart.
- [Someone scripting the endpoint inflates their own and the community count] → A token is
  required, and the numbers are cosmetic with no points attached. Accepted.
- [Overlap with your uncommitted edits to `PuzzleStore.cs` and `DailySlice.cs`] → This change
  adds new methods and does not edit the lines those edits touch. `DailySlice` needs no
  change at all, because daily starts go through the progress endpoint. Rebase or commit
  that work first.

## Migration Plan

- No data migration. `game_starts` is created on first write.
- Deploy server and client together (one container).
- Rollback: revert. `game_starts` rows would then be ignored, and the figures fall back to
  completions.
