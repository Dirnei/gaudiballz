## Context

See proposal.md — Why. The game currently records completions through
`PlayerSessionActor → PuzzleStore.RecordCompletionAsync`, which writes a best-result
document per player per level. Achievements build on that flow: after a completion is
persisted, the player's achievement state is re-evaluated.

The existing architecture uses one Akka actor per player (`PlayerSessionActor`) behind a
registry (`PlayerRegistryActor`), MongoDB for persistence, and vertical "slices" that
each implement `ISlice` with their own DI, endpoints, and actors. Achievements follow
this pattern as a new slice.

## Goals / Non-Goals

**Goals:**
- Award achievements server-side so they are authoritative and sync across devices.
- Keep achievement evaluation off the completion hot path — a failure must not lose a
  completion.
- Support retroactive evaluation at registration time without a batch job.
- Make the catalogue easy to extend with new achievements later (data-driven definitions,
  not one class per achievement).

**Non-Goals:**
- Leaderboards or social features (comparing achievements between players).
- Client-side achievement evaluation (the server is the authority).
- Push notifications or email about achievements.
- Gamification pressure (no nag, no "almost there" banners outside the panel).
- Achievement tiers or points (each achievement is binary: earned or not).

## Decisions

### 1. Achievement definitions are a static catalogue, not database rows

**Choice:** Define achievements as an in-memory list of records in C#, each with an id,
name, description, category, and evaluation function. No admin UI, no database table of
definitions.

**Why:** The catalogue is small (≈22 items), changes only at deploy, and every evaluation
needs the full list in memory anyway. A database table would add a load step, a cache
invalidation problem, and an admin surface for something that changes with the code.

**Alternative considered:** Store definitions in MongoDB so they can be changed without a
deploy. Rejected because there is no non-developer audience for an admin UI, and the
evaluation logic is code anyway — a definition without its evaluator is inert.

### 2. Achievement evaluation happens via a fire-and-forget actor message

**Choice:** After `RecordCompletionAsync` succeeds in `PlayerSessionActor`, send a
`CompletionEvent` message to an `AchievementEvaluatorActor`. The evaluator is a
separate actor (not the player session actor) so that evaluation latency and failures are
isolated from the completion flow.

**Why this earns an actor:** The evaluator reads the player's full progress and
achievement state, then writes new awards. That is a read-modify-write over two
collections for the same player, and two completions arriving close together could race.
A per-player evaluator mailbox serialises that naturally, the same way
`PlayerSessionActor` serialises progress writes. A plain service method called from two
concurrent requests would need its own lock or optimistic retry.

**Alternative considered:** Evaluate synchronously inside `PlayerSessionActor` before
replying. Rejected because it doubles the work the completion response waits for, and a
bug in evaluation would block the session actor.

### 3. Per-player evaluator actors behind a registry, same pattern as `PlayerRegistryActor`

**Choice:** An `AchievementRegistryActor` routes `CompletionEvent` messages to a
per-player `AchievementEvaluatorActor`, creating one on demand and passivating it after
idle. Same structure as the existing player registry.

**Why:** The pattern is proven in this codebase, passivation is already solved, and the
supervision strategy (restart on failure, losing nothing because state reloads from the
database) applies identically.

### 4. One MongoDB collection for awarded achievements, one for daily play

**`player_achievements` collection:**
- Document id: `{playerId}#{achievementId}` (composite, same pattern as progress).
- Fields: `PlayerId`, `AchievementId`, `AwardedAt`.
- Upsert with `$setOnInsert` for `AwardedAt`, so awarding twice is a no-op.

**`daily_play` collection:**
- Document id: `{playerId}#{date:yyyy-MM-dd}` (one document per player per UTC day).
- Fields: `PlayerId`, `Date`, `CompletionCount`.
- Upsert with `$inc` on `CompletionCount` and `$setOnInsert` on `Date`.
- Streak calculation: load all daily-play documents for the player, sort by date, and
  count the longest run ending on today. The collection is small (≤365 docs per player per
  year) and the range scan is served by the composite id's primary index.

**Alternative considered:** Store daily play inside the player document as an array. Rejected
because concurrent updates to the same array from two devices would need `$addToSet` and
the array grows unboundedly, making the player document heavier over time.

### 5. Attempt metadata is added to the completion payload, not the best-result document

**Choice:** The client sends `undoCount`, `restarted` (boolean), and `sessionId` (a
random string generated on page load) alongside the existing `level`, `moves`, `hints`.
The server passes this metadata through to the achievement evaluator but does NOT store
it in the `ProgressDocument` (the best-result record). It is stored only in the
`daily_play` document or used transiently by the evaluator.

**Why:** The best-result record is a fold — it keeps the minimum, not the history. Attempt
metadata is per-attempt, not per-best, so it does not belong in the fold. The evaluator
only needs it at the moment of evaluation, not later.

### 6. Marathon (session) tracking uses a client-provided session id

**Choice:** The client generates a random session id on page load and sends it with every
completion. The server counts distinct levels completed with the same session id for the
marathon achievement.

**Why:** The server has no concept of a browser session. A server-side session (cookie,
token-based) would need to track inactivity timeouts and would not match the user's
mental model of "one sitting". The client knows when the page loaded and when it unloads.

**Trust model:** A crafted session id could inflate the count. This is acceptable because
achievements carry no monetary value, there is no leaderboard, and the player only
cheats themselves. The same argument applies to the `restarted` flag.

### 7. Retroactive evaluation at registration

**Choice:** When `MarkEnrolledAsync` is called (player registers), the achievements
slice sends an `EvaluateRetroactive` message to the player's evaluator actor. The
evaluator loads the player's full progress and daily-play history and evaluates every
achievement in the catalogue, awarding any that are met.

**Why:** This ensures a player who played 50 levels anonymously and then registers sees
all their milestone, perfection and streak achievements immediately, without a batch job
or migration.

### 8. Completion response carries new achievements inline

**Choice:** The `POST /api/v1/progress/completions` response gains an optional
`newAchievements` array. The endpoint asks the evaluator (with a short timeout) and
includes whatever came back; if the evaluator is slow or fails, the array is empty and
the completion still succeeds.

**Why:** Avoids a second round-trip from the client. The toast only needs the name and id,
which is small. An empty array on timeout is better than blocking the completion.

**Timeout:** 2 seconds. If evaluation takes longer, the client does not see the toast for
that completion but the achievement is still awarded asynchronously and appears on the
next fetch.

### 9. Client-side session id and restarted tracking

**Choice:** A `sessionId` constant generated once at module load (a random hex string).
A `restartedLevels` set in the `useGame` hook that records level ids where `restart()`
was called. Both are sent with the completion payload.

**Why:** Minimal state, no persistence needed (both are deliberately lost on page close),
and the server does not need to trust them for anything safety-critical.

### 10. Achievements panel as a tab/section inside the existing `AccountPanel`

**Choice:** Add an "Achievements" section to the existing account panel rather than a
separate screen. Grouped by category, with a count badge on the section header.

**Why:** The account panel is where account-related things live. A separate screen would
need its own navigation entry, which is more surface area for something that is checked
occasionally. The panel already scrolls and has room.

## Risks / Trade-offs

**[Streak calculation loads all daily-play docs]** → For a player with years of history
this could be hundreds of documents. Mitigated by the composite-id range scan (no
secondary index needed) and by the fact that this runs inside the evaluator actor, not on
the HTTP request path. If it becomes a concern, a `current_streak` counter can be added
to the player document later as a cache.

**[Client-provided metadata is untrusted]** → A player could fabricate `restarted: true`
or a session id to earn exploration achievements. Mitigated by achievements having no
value beyond personal satisfaction and no social visibility. If social features are added
later, server-verified achievements should be distinguished from client-reported ones.

**[Evaluation races with itself on rapid completions]** → Two levels completed in quick
succession send two messages to the evaluator. The per-player actor mailbox serialises
them, so the second evaluation sees the awards from the first. No race.

**[Retroactive evaluation is O(catalogue × progress)]** → For 20 achievements and 100
levels this is trivially fast. If the catalogue grows to hundreds, batch the evaluation or
add early-exit checks.
