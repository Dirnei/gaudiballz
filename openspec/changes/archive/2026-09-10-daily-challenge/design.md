## Context

Levels are generated deterministically from a seed and difficulty parameters via `LevelGenerator.Generate(seed, params)`. The campaign uses `LevelCatalogue` which maps integer level IDs to parameters and selects the best of 14 candidates per level. The daily challenge bypasses the catalogue and calls the generator directly with a date-derived seed. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One puzzle per day derived from the UTC date, identical for all players.
- Scored with the existing `Scoring.Calculate` formula.
- Per-day best-result tracking, separate from campaign.
- Daily leaderboard ranked by stars → moves → time.
- Playable by anonymous players; leaderboard shows registered players only.
- Full i18n support (en + de) for all new strings.

**Non-Goals:**
- Calendar of past dailies or "catch up" mode.
- Separate daily-specific achievements (streak achievements already cover daily play).
- Sharing or social features beyond the leaderboard and activity feed.
- Difficulty that varies by day or escalates through the week.

## Decisions

### 1. Date-derived seed

**Choice:** `seed = Pcg32.SplitMix64(dateAsInt)` where `dateAsInt` is `year * 10000 + month * 100 + day` (e.g., 20260915). This produces a deterministic `ulong` that feeds `LevelGenerator.Generate`.

**Why:** Matches the existing generation pattern. Any player or server instance computing the seed for the same UTC date gets the same board. No database of daily puzzles needed.

### 2. Fixed difficulty parameters

**Choice:** 6 colours, capacity 4, 2 spare tubes — equivalent to the campaign's level 26-38 range. This is challenging enough to be interesting but not punishing.

**Why:** Two spare tubes keeps the daily accessible to players who haven't reached the one-spare-tube regime. Six colours gives enough complexity for meaningful scoring differences. Parameters are fixed across all days so leaderboard scores are comparable.

**Alternative considered:** Varying difficulty by day of week (easy Monday, hard Friday). Rejected — makes leaderboard comparisons unfair across days and complicates the scoring story.

### 3. Best-of-14 candidate selection

**Choice:** Use the same selection process as campaign levels — generate 14 candidates from the date seed and pick the one whose tightness is closest to a target (use the campaign's target for the equivalent difficulty level). This ensures daily puzzles are well-tuned, not random difficulty spikes.

**Why:** The raw generator can produce boards that are trivially easy or unusually hard for the same parameters. The selection process already exists and prevents this.

### 4. Separate daily result storage

**Choice:** A new MongoDB collection `dailyResults` with documents `{ playerId, date (UTC date string), moves, hints, stars, points, elapsedTimeMs, timestamp }`. Compound unique index on `(playerId, date)` with an upsert that keeps the best result.

**Why:** Campaign progress uses `PlayerProgress` (Akka actor per player). Daily results are simpler — no level map, no ceiling, no cross-level aggregation. A flat collection with date-keyed documents is sufficient and avoids touching the campaign actor.

### 5. Daily leaderboard

**Choice:** Query `dailyResults` for today's date, sort by `stars desc, moves asc, elapsedTimeMs asc`, limit to top 20. The endpoint accepts a `date` parameter (defaults to today). The viewer's own result is included alongside the ranked list if they've played.

**Why:** The existing period leaderboard aggregates across all levels. The daily leaderboard is per-puzzle, so it needs its own query. The volume is small enough (one row per player per day) that a direct query with an index on `(date, stars, moves, elapsedTimeMs)` is fine without pre-aggregation.

### 6. API endpoints

- `GET /api/v1/daily/today` — Returns the daily board (tubes, capacity, colourCount, parMoves, timeTargetMs, date). Cached for the remainder of the day.
- `POST /api/v1/daily/completions` — Records a daily completion. Same request shape as campaign completions but scoped to today's date. Returns stars, points, and whether this is a new personal best for the day.
- `GET /api/v1/daily/leaderboard?date=YYYY-MM-DD` — Returns the daily leaderboard. Defaults to today.

### 7. Client routing and state

**Choice:** New route `/daily` under `ImmersiveLayout`. A new `DailyScreen` component that reuses `Tube`, `ControlButton`, `DragOverlay`, and the same gameplay hooks, but loads from `/api/v1/daily/today` instead of `/api/v1/levels/{id}` and submits to `/api/v1/daily/completions`.

**Why not reuse GameScreen?** `GameScreen` is tightly coupled to campaign state (`levelId`, `goToLevel`, `levelCeiling`, `levelProgress`). Forking a `DailyScreen` is cleaner than adding conditional branches throughout `GameScreen`. The shared tube grid and controls are already components.

### 8. No Akka actors for daily results

The daily result flow is a simple upsert — no multi-level state, no actor lifecycle. Using `PuzzleStore` directly (as the activity feed and leaderboards already do) is appropriate. Akka actors earn their place for campaign progress because of the per-player state machine and mailbox serialization; daily results don't need that.

### 9. Achievement integration

Daily challenge completions report to the existing daily-play tracking (`RecordDailyPlayAsync`) so they count toward streak achievements. They do NOT call `RecordCompletion` on the campaign actor, so campaign milestones are unaffected. The marathon achievement tracks session completions client-side; a daily challenge completion in the same session counts toward the 10-level threshold.

## Risks / Trade-offs

- **Leaderboard gaming:** Players could restart endlessly to fish for a perfect run. This matches the campaign's philosophy (restarting is unlimited, no paywall). The leaderboard rewards skill and persistence equally, which is consistent.
- **Timezone confusion:** "Today" is UTC, not local time. A player at 23:00 UTC-5 sees a different daily than they might expect. Mitigation: Show the UTC date on the daily screen and in the countdown. This is a known trade-off; most daily-puzzle games use a fixed timezone.
- **Thin daily leaderboard early on:** With few players, the daily leaderboard may have only 1-2 entries. Not harmful — it grows with the player base.
