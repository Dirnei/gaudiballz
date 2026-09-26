# Design

## Context

Streaks are not stored today. Each consumer recomputes them from the `daily_play` collection,
which holds one row per player per UTC day with at least one completion:

- `HubSlice.CalculateStreak` / `CalculateBestStreak` serve `/api/hub/player/stats`, which feeds
  `ProgressTiles`, `StatsPage` and `PlayerActivity`.
- `AchievementCatalogue.CurrentStreak` evaluates the streak achievements on completion. It is a
  near-copy of the hub version, but without the "last day must be today or yesterday" check.
- `PuzzleStore` grants the streak-day bonus when no `daily_play` row exists yet for today.

`daily_play` rows mean "a level was completed that day". Other readers (streak bonus, "active
this week") depend on that, so frozen days cannot be stored as rows there.

## Goals / Non-Goals

**Goals:**
- One pure streak function that every consumer uses, covering played days, frozen days and
  freezes held.
- Freeze spending and earning that stay correct when two completions land at the same time.

**Non-Goals:**
- Buying freezes, or any currency (later change).
- Any per-player timezone. Streak days stay UTC.
- Granting freezes retroactively for streaks that exist when this ships.

## Decisions

### Separate `streak_freeze` document per player

`{ _id: playerId, Held: int, FrozenDays: [date], SettledThrough: date, Version: int }`.
The number of frozen days stays small (at most 2 per gap), so an embedded array is enough.

*Alternative:* a `Frozen` flag on `daily_play` rows. Rejected: every existing reader treats a
row as "completed that day", and each of them would need a filter it could easily miss.

### Pure `Streaks.Compute` in `Progression/`

`Compute(playedDays, frozenDays, held, today) → { Current, Best, CoveredNow, HeldShown }`:

- Merge played and frozen days. A run is unbroken if every day in it is played or frozen. Its
  length counts played days only.
- **Pending gap:** let `last` be the latest played or frozen day and `gap = today − last − 1`
  (today never counts as missed). If `0 < gap ≤ held`, the run is alive, `CoveredNow = gap` and
  `HeldShown = held − gap`. If `gap > held`, `Current = 0` and `HeldShown = held`.
- `Best` is the longest run by the same rule.

It is a plain static function with no I/O, unit-tested with day lists. It replaces both existing
copies. It lives in the Server project, not `GaudiBallz.Rules`, because it is progression, not
board rules, and the client doesn't need to mirror it (no conformance fixture).

### Settle on completion, not on a timer

Frozen days and earnings are written only when a verified completion is recorded (campaign
and daily both go through `RecordDailyPlayAsync`). `SettleStreakAsync(playerId, today)` runs
right after it:

1. If `SettledThrough == today`, stop. Settlement happens once per day, which also makes
   earning "at most once per streak length".
2. Compute the gap before today. If `0 < gap ≤ Held`, append those days to `FrozenDays` and
   subtract them from `Held`. If the gap is larger, leave `Held` unchanged.
3. Compute `Current` including today. If `Current % 7 == 0`, set `Held = min(2, Held + 1)`.
4. Write with a filter on `Version` (optimistic concurrency). On conflict, re-read. The step-1
   check makes the retry a no-op.

Between visits nothing is written. Reads compute the covered state with `Compute`, so the tile
already shows the reduced count and the kept streak (spec: "Covered streak is shown before the
player plays again"). Results don't depend on how often the player opens the app.

*Alternative:* a daily job that spends freezes at UTC midnight. Rejected: it needs a scheduler,
touches inactive players, and would spend freezes on a 3-day gap one day at a time, which the
spec forbids.

**Actors:** they don't earn their place here. Settlement is a single conditional document
update. The optimistic `Version` check handles concurrent completions without routing
everything through a per-player actor. The wallet actor is unaffected.

### Achievement evaluation reads freeze state

The achievement context gets the player's frozen days. The `streak-*` checks call
`Streaks.Compute`. Full-week stays on played days only, as it is today.

### API shape

`/api/hub/player/stats` adds `streakFreezes` (`HeldShown`) and `streakSavedDays`
(`CoveredNow`, 0 when nothing is covered). `currentStreak` and `bestStreak` keep their names
and now use the new rule.

### Home notice dismissal is per device

The client stores the dismissed gap as `localStorage["streakNoticeDismissed"] = <last played
or frozen day>`. A new gap has a different anchor day, so its notice shows again. Per-device is
fine: at worst a player sees the notice once on each device.

### Determinism

Nothing here is seeded generation. The only determinism requirement is that UTC day boundaries
come from one clock source. `today` is passed in (from `TimeProvider`) rather than read inside
`Compute`, so tests can pin it.

## Risks / Trade-offs

- [The hub's `currentStreak` behaviour changes, and the achievement copy drifts from the hub
  copy] → Both are replaced by one function. Tests cover the old scenarios (broken streak,
  multiple completions per day) as well as the new ones.
- [Concurrent completions double-earn or double-spend] → The once-per-day `SettledThrough` gate
  plus the `Version` filter. An integration test fires two completions in parallel.
- [Anonymous players can't reach `/player/stats`] → The endpoint checks a player token, which
  anonymous players also hold. Confirm this while implementing. If the endpoint is
  registered-only, expose the streak fields on a route anonymous players can use.
- [Account linking changes the player id] → Confirm linking keeps the id. If it merges ids,
  carry `streak_freeze` across the same way `daily_play` is carried.

## Migration Plan

No backfill. A missing `streak_freeze` document means `Held = 0` with no frozen days, and it is
created on first settlement. Existing streaks keep their length and start earning at the next
multiple of 7. Rollback: remove the fields from the response. The extra collection is ignored.
