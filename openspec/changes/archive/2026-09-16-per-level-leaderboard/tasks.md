## 1. Dependencies and configuration

- [x] 1.1 Add Akka.Persistence.MongoDb NuGet package to GaudiBallz.Server
- [x] 1.2 Add Akka.Streams NuGet package to GaudiBallz.Server
- [x] 1.3 Configure Akka.Persistence.MongoDb journal and snapshot store in the actor system setup (connection string from existing MongoDB config)

## 2. Completion event and persistent actor

- [x] 2.1 Define `LevelCompleted` event record with raw fact fields only (PlayerId, Username, Level, Moves, Hints, Undos, Restarted, ElapsedTimeMs, ProfileBall, Timestamp) — no Stars or Points (derived at projection time)
- [x] 2.2 Create `LevelCompletionJournal` persistent actor (persistence id `level-completion-{playerId}`) that persists `LevelCompleted` events
- [x] 2.3 Write tests for the journal actor: event is persisted, recovery replays events, duplicate handling
- [x] 2.4 Wire `PlayerSession` to send `RecordCompletion` to the journal actor after a verified completion (fire-and-forget, does not block the completion response)

## 3. Materialized collection and projection

- [x] 3.1 Create `level_leaderboard` MongoDB collection and add compound index `{ Level: 1, Period: 1, BestStars: -1, BestMoves: 1, BestTimeMs: 1 }`
- [x] 3.2 Implement Akka.Streams projection: read journal by tag `"level-completion"`, derive stars/points via `Scoring.Calculate()` from raw event facts, upsert into `level_leaderboard` with dominance-check logic for three periods (all-time, weekly, daily)
- [x] 3.3 Write tests for the projection: new completion creates entry, better result updates entry, worse result is ignored, all three periods are written
- [x] 3.4 Start the projection stream on application startup

## 4. Backfill

- [x] 4.1 Write a one-time backfill that reads existing `ProgressDocument`s and inserts all-time entries into `level_leaderboard` for registered players
- [x] 4.2 Test the backfill: existing best results appear on the leaderboard, anonymous players are excluded

## 5. Server API

- [x] 5.1 Write integration tests for the level-leaderboard endpoint: top 10 in correct order, anonymous excluded, time-period filtering, viewer rank inside and outside top 10, viewer with no completion, viewer with no result in selected period
- [x] 5.2 Add `GetLevelLeaderboardAsync` to `PuzzleStore`: query `level_leaderboard` for a given level and period, sorted by stars desc / moves asc / time asc, limit 10
- [x] 5.3 Add viewer rank count query to `PuzzleStore`: count documents that rank above the viewer for a given level and period
- [x] 5.4 Add `GET /api/hub/level-leaderboard?level={n}&period={alltime|week|today}` endpoint in `HubSlice`

## 6. Client: API and data

- [x] 6.1 Add `fetchLevelLeaderboard(level: number, period: string)` function returning typed response
- [x] 6.2 Write tests for the fetch function

## 7. Client: leaderboard panel UI

- [x] 7.1 Create `LevelLeaderboard` component showing top-10 table with rank, profile ball, rank ring, rank badge, username, stars, moves, time
- [x] 7.2 Add time-period toggle (all time / this week / today) matching the global leaderboard's UI
- [x] 7.3 Show viewer's own row highlighted when in top 10, or as a separate footer row when outside
- [x] 7.4 Add i18n keys for level leaderboard labels and period names

## 8. Client: integration points

- [x] 8.1 Add leaderboard access from the win screen (button or expandable section)
- [x] 8.2 Redesign level-select as two-column layout: grid left, leaderboard detail panel right (mobile: full-screen overlay on tap)
- [x] 8.3 Allow leaderboard viewing for any accessible level (not just completed); locked levels remain non-selectable

## 9. End-to-end verification

- [x] 9.1 Rebuild Docker image and verify at http://localhost:8123
- [x] 9.2 Complete a level, check the leaderboard shows the result
- [x] 9.3 Verify anonymous play does not appear on the board
- [x] 9.4 Verify viewer position shown when outside top 10
- [x] 9.5 Verify time-period toggle shows different results for all-time vs today
- [x] 9.6 Verify backfill populates the leaderboard with existing progress
