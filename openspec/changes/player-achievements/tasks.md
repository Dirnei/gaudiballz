## 1. Database layer — documents, store methods, indexes

- [ ] 1.1 Add `AchievementDocument` and `DailyPlayDocument` to `Documents.cs` with BSON class maps (composite id pattern matching `ProgressDocument`)
- [ ] 1.2 Add `AchievementStore` methods to `PuzzleStore`: `AwardAchievementAsync` (upsert with `$setOnInsert`), `LoadAchievementsAsync` (range scan by player), `RecordDailyPlayAsync` (upsert with `$inc`), `LoadDailyPlayAsync` (range scan by player)
- [ ] 1.3 Add index creation for `player_achievements` and `daily_play` collections in `IndexInitializer` / `EnsureIndexesAsync`
- [ ] 1.4 Write tests for store methods: award idempotency, daily play upsert increments, range scan returns correct documents

## 2. Achievement catalogue — definitions and evaluation logic

- [ ] 2.1 Define the `AchievementDefinition` record type: id, name, description, category, optional threshold (for progress display)
- [ ] 2.2 Define `CompletionContext` record carrying all data the evaluator needs: player id, level, moves, hints, undo count, restarted flag, session id, colour count, par moves, current progress snapshot, current daily-play history, already-awarded set
- [ ] 2.3 Implement the static achievement catalogue (all 22 achievements) as a list of `AchievementDefinition` with evaluation functions
- [ ] 2.4 Write unit tests for each achievement category's evaluation logic: milestones (count thresholds including 150, replay no-inflate), perfection (under-par single-completion, cumulative no-hint at 10/25, cumulative purist at 40, speed-demon at 5), streaks (consecutive days, broken streak, same-day dedup), calendar week (full and partial), exploration (restarted, all-hints, deep-diver, marathon)

## 3. Achievement evaluator actors

- [ ] 3.1 Define messages: `CompletionEvent` (player id, level, result, metadata), `EvaluateRetroactive` (player id), `AchievementResult` (list of newly awarded ids/names)
- [ ] 3.2 Implement `AchievementEvaluatorActor`: on `CompletionEvent` — load progress, daily play, and awarded set from store; evaluate catalogue; write new awards; reply with `AchievementResult`. On `EvaluateRetroactive` — same but evaluates all achievements without a specific completion context
- [ ] 3.3 Implement `AchievementRegistryActor` with per-player child routing, passivation, and buffering (same pattern as `PlayerRegistryActor`)
- [ ] 3.4 Write actor tests: evaluator awards correct achievements on completion, idempotent on duplicate completion, retroactive evaluation awards accumulated milestones, registry routes to correct child and passivates idle children

## 4. Completion flow — metadata and achievement notification

- [ ] 4.1 Extend the completion request DTO to accept `undoCount`, `restarted`, and `sessionId` fields (optional, defaulting to safe values for backwards compatibility)
- [ ] 4.2 Extend `RecordCompletion` command to carry attempt metadata through to the actor
- [ ] 4.3 In `PlayerSessionActor.Ready`, after `RecordCompletionAsync` succeeds, send `CompletionEvent` to the achievement registry (fire-and-forget for the write; Ask with 2s timeout for the inline response)
- [ ] 4.4 Extend the completion endpoint response to include `newAchievements` array (empty on timeout or anonymous player)
- [ ] 4.5 Write tests: completion with metadata is accepted, completion without metadata (old client) still works, achievement failure does not block completion response

## 5. Achievements API endpoint

- [ ] 5.1 Create the `Achievements` slice implementing `ISlice`: register store methods, actors, and endpoint
- [ ] 5.2 Implement `GET /api/v1/achievements` endpoint: returns full catalogue with earned state, timestamps, and progress for threshold achievements. Requires authentication; returns 401 for anonymous
- [ ] 5.3 Wire retroactive evaluation: after `MarkEnrolledAsync` (registration), send `EvaluateRetroactive` to the achievement registry
- [ ] 5.4 Write integration tests: registered player sees full catalogue with earned/locked state, progress numbers are correct, anonymous player gets 401

## 6. Client — metadata in completion payload

- [ ] 6.1 Generate a `sessionId` constant at module load in `identity.ts` (random hex string)
- [ ] 6.2 Track `restartedLevels` set in `useGame` — add level id on restart, clear on level change
- [ ] 6.3 Track `undosUsed` counter in `useGame` — increment on undo, reset on level change and restart
- [ ] 6.4 Extend `recordCompletion` in `progress.ts` to send `undoCount`, `restarted`, and `sessionId` in the POST body
- [ ] 6.5 Parse `newAchievements` from the completion response and surface it from `recordCompletion`
- [ ] 6.6 Write tests: completion payload includes metadata fields, missing response field defaults to empty array

## 7. Client — achievements fetch and types

- [ ] 7.1 Create `achievements.ts` module with types (`Achievement`, `AchievementState`) and `loadAchievements()` fetch function
- [ ] 7.2 Add achievements state to `useGame` hook: fetch on account panel open (lazy, like ball unlocks), store in state
- [ ] 7.3 Write tests: fetch parses response correctly, anonymous identity skips fetch

## 8. Client — achievement toast

- [ ] 8.1 Create `AchievementToast` component: animated entry/exit with Motion, auto-dismiss after ~3 seconds, shows achievement name, non-blocking
- [ ] 8.2 Integrate toast into `App.tsx`: when `recordCompletion` returns new achievements after solving, queue them for display on the solved screen
- [ ] 8.3 Write tests: toast renders achievement name, dismisses automatically, does not render for empty array

## 9. Client — achievements panel in account panel

- [ ] 9.1 Create `AchievementsSection` component: groups by category, earned vs locked visual distinction, progress indicator for threshold achievements (e.g., "7 / 10")
- [ ] 9.2 Integrate into `AccountPanel`: show section only for registered (non-anonymous) players, trigger achievements fetch on panel open
- [ ] 9.3 Write tests: section renders grouped achievements, locked ones show progress, section hidden for anonymous players

## 10. Docker rebuild and manual verification

- [ ] 10.1 Rebuild the Docker image and verify the game runs on port 8123
- [ ] 10.2 Manual smoke test: complete a level as a registered player, verify achievement toast appears, verify achievements panel shows earned and locked achievements with correct progress
