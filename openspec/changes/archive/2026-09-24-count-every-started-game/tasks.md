# Tasks

## 1. Before starting

- [x] 1.1 Commit or set aside the uncommitted edits to `PuzzleStore.cs`, `DailySlice.cs` and `DailySliceTests.cs`, so this change's diff stays its own. Verify that `git status` shows those files clean, or that the user has confirmed building on top of them.

## 2. Server: recording starts

- [x] 2.1 Add `GameStartDocument` (`Id` "{playerId}#{yyyy-MM-dd}", `PlayerId`, `Date`, `Starts`) with its class map in `Documents.cs`, a durable `game_starts` collection in `PuzzleStore`, and `RecordGameStartAsync(playerId, utcDate)` as an `$inc` upsert. Verify with a `PuzzleStoreTests` case: two starts on one day give `Starts == 2`, and no `daily_play` row is created.
- [x] 2.2 Add `POST /api/v1/progress/attempts/start` in `ProgressionSlice` with body `{ mode }`: 401 without a token, 400 for an unknown mode, 204 after recording. Verify with `AttemptEndpointTests` cases for all three responses and a recorded start.

## 3. Server: reading games played

- [x] 3.1 Add `GetGamesPlayedByDayAsync(string? playerId, int days)` to `PuzzleStore`, returning a per-day map. A day with starts uses them; otherwise it uses completions, per player or summed for the community (design decision 3). Verify with store tests: a start-only day, a completion-only (pre-change) day, and a day with both (the starts win). Also check that the community sum spans players.
- [x] 3.2 Switch `HubSlice` community-stats (`dailyHistory`, `gamesThisWeek`, `gamesThisMonth`, `gamesAllTime`) and player stats (the same four fields) to that method. Leave `solvedToday`, `activeThisWeek` and streaks on `daily_play`. Verify with an endpoint test on player stats (community-stats is output-cached for 30 s, so its merge is covered by the store tests): a restart followed by a clear gives today, week, month and all-time games of 2 and a streak of 1, and daily games count too.
- [x] 3.3 Guard completion-based behaviour. Verify with tests that a start writes no completion row (which is all `CountActivePlayersThisWeekAsync` and `CountSolvedTodayAsync` read, since both are global counts that parallel tests would make flaky to compare), does not create a streak in player stats, and does not prevent the first-clear-of-the-day streak bonus.

## 4. Client

- [x] 4.1 Add `reportGameStarted(mode: 'campaign' | 'daily')` to `client/src/game/progress.ts`, as a keepalive `fetch`, best-effort, following `reportAttemptEnded`. Verify with a unit test that it posts the mode with auth headers and swallows a network error.
- [x] 4.2 In `useGame`, report `'campaign'` when `attemptOpen` turns from false to true. Verify with a hook test: several moves send one report, a restart plus a move sends a second, and opening a level without moving sends none.
- [x] 4.3 In `useDailyGame`, add an attempt-open flag that is reset on load and on restart, set it on the first move (via `onMove`), and report `'daily'` on the transition. Verify with a hook test mirroring 4.2.

## 5. Ship

- [x] 5.1 Run `dotnet test` and `cd client && npm test && npm run build`. Verify all are green.
- [x] 5.2 Rebuild with `docker compose up -d --build`. On http://localhost:8123, note the home-page games-played figures, then start a level, restart it, move again and leave it, and start the daily and leave it. Verify that opening alone reports nothing, three starts are reported (two campaign, one daily), the stats page shows 3 games today with no streak, and the community figures count the day by its starts while "solved today" and "active this week" stay put. (Clearing in the browser was not automated; the clear path is covered by `GamesPlayedTests`.)
