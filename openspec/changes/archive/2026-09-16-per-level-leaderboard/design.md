## Context

See proposal.md — Why. The existing global leaderboard ranks all players by total XP
across a single MongoDB collection (`leaderboard`) with one document per player per time
period. Level completions are stored in `progress` as one document per player per level
(`ProgressDocument`), holding only the best result — previous attempts are discarded.

The project uses Akka.NET actors (basic `ReceiveActor` / `UntypedActor`) but does not
yet use Akka.Persistence or Akka.Streams. The `PlayerSession` actor manages in-flight
gameplay state; completions flow from it into `PuzzleStore` as direct MongoDB writes.

## Goals / Non-Goals

**Goals:**

- Top-10 per-level leaderboard with time-period filtering (all time, this week, today)
- Event-source every completion as raw facts (moves, hints, undos, restarts, elapsed time)
  — scores are derived, not stored, so leaderboards can be recalculated if scoring changes
- Viewer's own rank when outside the top 10
- Accessible from the win screen and level-select screen
- Establish Akka.Persistence infrastructure that future features (wallet, per-game actors)
  can build on

**Non-Goals:**

- Replacing the existing global leaderboard infrastructure (it stays as-is)
- Replacing `ProgressDocument` for best-result tracking (it remains the source of truth
  for progression and scoring — the event journal is additive)
- Real-time push updates (fetch-on-demand is sufficient)
- Player-facing attempt history UI (the journal enables it later, but this change does
  not expose it)

## Decisions

### 1. Akka.Persistence.MongoDb for the event journal

**Choice**: Add Akka.Persistence.MongoDb. Completion events are persisted to a MongoDB
journal collection via a persistent actor, one persistence id per player.

**Why**: MongoDB is already the only datastore. Adding a second store (Postgres, EventStoreDB)
would double the infrastructure for a single-player puzzle game. Akka.Persistence.MongoDb
uses the same connection and the journal lives alongside existing collections.

**Alternative considered**: A plain MongoDB collection with manual append-only inserts.
Rejected — Akka.Persistence gives sequence numbers, recovery, and snapshot support for
free, and the journal format is what Akka.Streams can read directly.

### 2. Completion event shape — raw facts, no scores

**Choice**: Each event carries only observable facts:
- `PlayerId`, `Username` (null if anonymous), `Level`
- `Moves`, `Hints`, `Undos`, `Restarted` (bool), `ElapsedTimeMs`
- `Timestamp` (UTC)
- `ProfileBall` (nullable int)

Stars and points are **not** stored in the event. They are derived at projection time
by calling `Scoring.Calculate(moves, hints, elapsedTimeMs, par, timeTarget)` — the same
pure function the completion endpoint uses today. Par and time target come from
`LevelCatalogue`, which is deterministic for a given level number.

**Why**: Separating raw facts from derived scores means a scoring bug can be fixed by
replaying the journal through corrected logic and rebuilding the materialized view. If
Stars/Points were baked into the event, fixing a scoring bug would require either mutating
the journal (violating immutability) or carrying a version/correction scheme.

Username and ProfileBall are denormalized onto the event so the projection can build
leaderboard rows without joining against the player collection.

### 3. Persistent actor per player for journaling

**Choice**: A `LevelCompletionJournal` persistent actor with persistence id
`level-completion-{playerId}`. On each verified completion, the `PlayerSession` sends it
a `RecordCompletion` message; the journal actor persists the event and replies with an ack.

**Why**: The persistent actor gives us ordered, sequenced events per player with
automatic recovery. One actor per player keeps the event stream partitioned the same way
the rest of the system is partitioned (by player). The journal actor is fire-and-forget
from the completion flow — it does not block the completion response to the client.

An actor earns its place here because the event journal has long-lived state (the
sequence number), ordering matters (events must not be reordered for correct projection),
and Akka.Persistence requires an actor host.

### 4. Akka.Streams projection into a materialized MongoDB collection

**Choice**: An Akka.Streams `PersistenceQuery` reads the journal by tag (all completion
events tagged `"level-completion"`) and projects them into a `level_leaderboard` MongoDB
collection. The projection maintains one document per (level, playerId, period) tuple,
keeping the best result seen in that period.

The materialized collection is a regular MongoDB collection with a compound index — not
an Akka snapshot. Akka snapshots are for actor recovery; the leaderboard collection is a
read-optimized projection that the API queries directly, outside the actor system.

For each event, the projection:
1. Derives stars and points via `Scoring.Calculate()` using the event's raw facts
2. Upserts three documents (all-time, weekly, daily) with dominance check — only updates
   if the new result beats the existing best (same logic as `UpsertDailyResultAsync`)

**Why**: Akka.Streams gives backpressured, resumable reads from the journal. The
projection is a continuous stream that processes new events as they arrive. If the
scoring logic changes or a new time window is needed, the projection can be replayed
from the journal to rebuild the materialized view with corrected scores — this is the
key benefit of separating raw events from derived scores.

**Rebuild procedure**: Reset the stored offset to the beginning, optionally clear the
`level_leaderboard` collection, restart the projection. All events replay through the
current `Scoring.Calculate()`, producing a fully recalculated materialized view.

**Periods**: The projection writes three entries per completion event:
- All-time (period = null): update if the new result beats the existing best
- Weekly (period = ISO week string, e.g. "2026-W38"): same logic, scoped to the week
- Daily (period = UTC date string, e.g. "2026-09-15"): same logic, scoped to the day

Old daily/weekly documents can be cleaned up by a TTL index or a periodic sweep, but
they are harmless if left — queries filter by the current period string.

### 5. Materialized collection schema

**Choice**: `level_leaderboard` collection with documents shaped as:
```
{
  _id: "{level}#{playerId}#{period|'alltime'}",
  Level, PlayerId, Username, ProfileBall, Period (nullable),
  BestStars, BestMoves, BestTimeMs,
  UpdatedAt
}
```

Compound index: `{ Level: 1, Period: 1, BestStars: -1, BestMoves: 1, BestTimeMs: 1 }`

**Why**: One document per (level, player, period) means the top-10 query is a simple
sort-and-limit on the index. The same shape the global leaderboard uses, just keyed
differently.

### 6. Viewer's own rank via count query

**Choice**: Same approach as the global leaderboard. Count documents in
`level_leaderboard` for the given level and period where the result is better than the
viewer's. Rank = count + 1.

### 7. Backfill from existing completions

**Choice**: A one-time backfill job reads existing `ProgressDocument`s and writes
synthetic all-time events into the journal (or directly into the materialized collection)
so that existing best results appear on the leaderboard from day one.

**Why**: Without this, the leaderboard would be empty until players replay levels after
the feature ships. The backfill is lossy — only the best result per level is available,
not the full attempt history — but it seeds the all-time leaderboard correctly. Weekly
and daily views start empty, which is correct (no historical daily data exists).

### 8. Single API endpoint with period parameter

**Choice**: `GET /api/hub/level-leaderboard?level={n}&period={alltime|week|today}`
returning `{ entries: [...], viewer: { rank, stars, moves, timeMs } | null }`.

### 9. Client: inline panel, not a full page

**Choice**: The per-level leaderboard is shown as a panel/modal accessible from the win
screen and from a tap on a level-select tile, with a period toggle matching the global
leaderboard's UI.

**Why**: The data is small (10 rows) and contextual to a specific level. A full page
would require navigation away from the current flow.

## Risks / Trade-offs

- **New dependencies**: Akka.Persistence.MongoDb and Akka.Streams are significant
  additions. They pull in Akka.Persistence core, the query-side plugin, and the streams
  library. The upside is they unlock event sourcing for the whole system, not just this
  feature.
- **Journal storage**: Every completion is now persisted forever. At current player
  volume this is negligible, but the journal will grow linearly with play volume.
  Snapshots can be added later to compact old sequences.
- **Projection lag**: The materialized view is eventually consistent — a completion may
  not appear on the leaderboard for a brief moment after it is recorded. This is
  acceptable; the spec says "the next time the leaderboard is fetched."
- **Backfill is lossy**: Only the all-time best per level can be seeded from existing
  data. Full attempt history begins from the moment the feature ships.
- **Username denormalization**: Username is baked into the event at write time. If
  username changes are ever added, the projection would need to handle renames (update
  materialized documents, but the journal events retain the original name as historical
  fact).

## Future: what this infrastructure unlocks

This change introduces Akka.Persistence and Akka.Streams to the project. Future changes
can build on this without repeating the infrastructure setup:

- **Points wallet**: A persistent actor that receives point credits as discrete events.
  Replaces the current `TotalPoints = Sum(Points + BonusPoints)` derivation with an
  authoritative point journal. If scoring changes, revoke old credits and issue corrected
  ones. The global leaderboard would migrate to read from the wallet.
- **Per-game actor**: A persistent actor per active game session that records moves as
  they happen. Enables server-side replay, move validation, and "save only the best play"
  control.
- **Bonus recalculability**: Bonuses (first-clear, streak, time-bonus) are computed at
  completion time in the current design and are not replayable from the completion journal
  alone. The wallet change would make bonus credits individually journaled and correctable.
