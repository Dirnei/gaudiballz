## Context

The game already tracks moves, hints, and par per level. Par comes from `Level.ConstructiveSolution.Count` and is served in the levels endpoint. `LevelResult(Moves, Hints)` stores the best per-field minimum. The completion flow is: client calls `POST /api/v1/progress/completions` with `{level, moves, hints}`, the server persists via the player's session actor, and returns updated progress.

## Goals / Non-Goals

**Goals:**
- Star rating computed server-side from moves, time, hints, par, and time target
- Time target derived from level difficulty metadata already available in `LevelCatalogue`
- Backward-compatible: existing completions and API clients still work; unrated levels show 0 stars
- Client-side timer that pauses correctly and submits elapsed time

**Non-Goals:**
- Points as spendable currency (future feature; this change only accumulates them)
- Leaderboards or cross-player comparisons
- Retroactive star calculation for past completions (no time data exists for them)
- Changing the existing per-field minimum folding for moves and hints

## Decisions

### 1. Star calculation is a pure function, not an actor

The rating is a deterministic function of `(moves, hints, elapsedTimeMs, par, timeTargetMs)` with no state and no side effects. A static method in the `Puzzle.Rules` domain library is the right home — it keeps the logic testable without Akka, and mirrors how the rules engine itself is structured.

**Why not an actor:** Actors earn their place when work needs per-player state, mailbox serialisation, or lifecycle management. Star calculation has none of those: it takes five numbers and returns a rating. Wrapping it in an actor adds message overhead with no benefit.

### 2. Time target derived from par and spare-tube regime

Each level's time target is `par × secondsPerMove`, where `secondsPerMove` depends on the difficulty regime:

- **2 spare tubes** (levels 1–49): `par × 3` seconds
- **1 spare tube** (levels 50+): `par × 4` seconds

The one-spare regime gets more time per move because each position has fewer legal moves and requires more deliberation. This maps to a method on `LevelCatalogue` (analogous to `ChapterNote`) that takes a level id and returns the time target in milliseconds.

**Why not a per-level table:** The difficulty curve is already a function of level id. Deriving the time target from the same parameters keeps it consistent and avoids a second data source to maintain. If playtesting shows specific tiers need adjustment, the formula accepts per-tier constants.

**Alternative considered:** Flat `par × 3.5s` for all levels. Rejected because one-spare levels have measurably tighter decision spaces (75–95% of positions have ≤ 3 legal moves vs 12–27% for two-spare), so players genuinely need more thinking time.

### 3. LevelResult extended with Stars and Points

`LevelResult` grows to `LevelResult(Moves, Hints, Stars, Points)`.

The `Best()` fold becomes:
- `Moves` → min
- `Hints` → min
- `Stars` → max
- `Points` → max

Stars and points track the best single-attempt rating. Moves and hints continue to track per-field minimums. These can represent different attempts, which is correct: a player who used hints to find a short path deserves their move record, and a player who found a hintless path deserves their star record.

**Backward compatibility:** Existing persisted documents have no `stars`/`points` fields. MongoDB deserialization defaults these to 0. A 0-star result is treated as "unrated" in the UI.

### 4. Server computes stars on completion

The client submits elapsed time; the server computes the star rating. The server already knows the level's par and can compute the time target, so it has everything needed.

**Why server-side:** Prevents client-side manipulation of star/point values. The client can still compute stars locally for instant UI feedback, but the persisted result comes from the server.

**Elapsed time is nullable** in the request (`ElapsedTimeMs?: int`). When absent (old client, offline replay), the server treats time as over the target — max 2 stars achievable from moves alone. This keeps old clients working without breaking the schema.

### 5. Client timer using performance.now()

The timer tracks wall-clock milliseconds between the first move and the solving move:
- **Start:** on first move (not level load)
- **Stop:** on solving move
- **Pause:** on `document.visibilitychange` when `hidden`, on modal overlay open (restart confirmation, stuck notice)
- **Resume:** on visibility `visible`, on overlay close
- **Reset:** on restart

`performance.now()` is used for monotonic precision. The timer stores `startedAt` and `accumulatedMs` — on pause, accumulated time is saved; on resume, `startedAt` resets. The final value is `accumulatedMs + (now - startedAt)`.

### 6. Time target served in levels endpoint

The `GET /api/v1/levels/{levelId}` response gains a `timeTargetMs` field alongside the existing `parMoves`. The level response is immutable and cache-friendly (365-day cache), so the time target is computed once and cached with the rest.

### 7. Progress API carries stars and points

The progress response adds per-level `stars` and `points` fields, plus a top-level `totalPoints`:

```
{
  levelsCompleted: 42,
  highestCompleted: 42,
  totalPoints: 12350,
  levels: [
    { level: 1, moves: 6, hints: 0, stars: 3, points: 500 },
    ...
  ]
}
```

The completion response includes the same shape, plus the just-earned star rating for the current attempt:

```
{
  ...progress fields...,
  attemptStars: 2,
  attemptPoints: 250,
}
```

This lets the win screen show both "you earned X" and "your best is Y" without a second request.

### 8. Merge includes stars and points

`PlayerProgress.MergedWith` already folds per-level results. The extended `LevelResult.Best()` naturally handles stars/points (max) alongside moves/hints (min). No change to merge logic beyond the `Best()` extension.

The client-side merge request (`POST /api/v1/progress/merge`) gains optional `stars` and `points` per entry, defaulting to 0 when absent.

## Risks / Trade-offs

**[Untrusted elapsed time]** → The client reports its own elapsed time, which a determined user could falsify. Mitigation: stars are cosmetic and points are not yet spendable; the server can add a plausibility check later (elapsed time < move count × 500ms is suspicious). Full server-side timing would require a stateful session, which is disproportionate for a single-player puzzle game.

**[No retroactive ratings]** → Players who already completed levels get 0 stars on those levels. Mitigation: this is intentional — replaying for stars is the point of the feature. A player who wants to fill in their star chart can replay levels, which drives engagement.

**[Time target tuning]** → The `par × secondsPerMove` formula is an educated guess. If playtesting shows it is too generous or too tight, the constants are trivially adjustable per tier without changing the architecture. Since the time target is served from the server and cached per level, a tuning change takes effect immediately for new level loads.

**[Offline completions miss time]** → Completions queued offline may have been played across app restarts, making their elapsed time meaningless. The nullable `ElapsedTimeMs` handles this: the server treats a missing value as "over time target." This is conservative (max 2 stars) and correct.
