## 1. Server — Daily Puzzle Generation

- [x] 1.1 Add a `DailyChallenge` static class with `BoardForDate(DateOnly date)` that derives a seed from the date, generates 14 candidates with fixed parameters (6 colours, capacity 4, 2 spare tubes), selects the best by tightness, and returns the `Level`
- [x] 1.2 Write unit tests for `BoardForDate`: same date → same board, different date → different board, board has expected parameters

## 2. Server — Daily API Endpoints

- [x] 2.1 Add `GET /api/v1/daily/today` endpoint that returns `{ date, tubes, capacity, colourCount, parMoves, timeTargetMs }` using `DailyChallenge.BoardForDate` for today's UTC date; cache the response until midnight UTC
- [x] 2.2 Add a `DailyResultDocument` model in `Documents.cs` with fields: `PlayerId`, `Date`, `Moves`, `Hints`, `Stars`, `Points`, `ElapsedTimeMs`, `Timestamp`
- [x] 2.3 Add `UpsertDailyResultAsync` in `PuzzleStore` that inserts or updates (keeping best: highest stars, then fewest moves, then fastest time) with a compound index on `(Date, PlayerId)`
- [x] 2.4 Add `POST /api/v1/daily/completions` endpoint that scores the attempt with `Scoring.Calculate`, calls `UpsertDailyResultAsync`, records a `daily-completed` activity feed event for registered players, reports to daily-play tracking for streak achievements, and returns `{ stars, points, isNewBest }`
- [x] 2.5 Add `GetDailyLeaderboardAsync` in `PuzzleStore` that queries `dailyResults` for a given date, sorted by stars desc → moves asc → elapsedTimeMs asc, limited to 20 entries
- [x] 2.6 Add `GET /api/v1/daily/leaderboard` endpoint (optional `?date=YYYY-MM-DD`, defaults to today) that returns `{ entries[], viewer }` — viewer is the requesting player's result if they've played
- [x] 2.7 Write integration tests: daily endpoint returns valid board, completion records and scores correctly, leaderboard ranks by stars → moves → time, replay keeps best result, anonymous completion works but doesn't appear on leaderboard

## 3. Client — Daily Challenge Screen

- [x] 3.1 Add route `/daily` under `ImmersiveLayout` in `App.tsx`
- [x] 3.2 Create `DailyScreen.tsx` — immersive gameplay screen that fetches from `/api/v1/daily/today`, renders the tube grid and controls (Home, Undo, Hint, Restart), shows the date as the level identifier instead of a level number
- [x] 3.3 Wire up completion: on solve, POST to `/api/v1/daily/completions` with moves, hints, elapsed time
- [x] 3.4 Build the solved overlay: stars, points, moves, time, "View Leaderboard" button, "Play Again" button, no "Next level"
- [x] 3.5 Add a countdown to next daily challenge (time until midnight UTC) shown after solving
- [x] 3.6 Build an inline daily leaderboard view (top 20 + viewer's own result) loaded from `/api/v1/daily/leaderboard`, shown when "View Leaderboard" is tapped on the solved overlay

## 4. Client — Main Menu Integration

- [x] 4.1 Add a "Daily Challenge" button to `MainMenu.tsx` alongside Play and Level Select, navigating to `/daily`
- [x] 4.2 Add a visual indicator on the main menu showing whether today's daily has been completed (e.g., a small checkmark or star on the button) — read from localStorage or a quick API check

## 5. Activity Feed Integration

- [x] 5.1 Add `daily-completed` event kind handling in `ActivityFeed.tsx` `formatEvent` function
- [x] 5.2 Add translation keys for `activityFeed.dailyCompleted` in `en.json` and `de.json` (e.g., "completed the daily challenge with {{stars}} stars")

## 6. i18n — New Strings

- [x] 6.1 Add all daily challenge UI strings to `en.json`: daily challenge button label, date display, solved overlay text, leaderboard labels, countdown text, completion status
- [x] 6.2 Add all corresponding German translations to `de.json`
- [x] 6.3 Verify locale parity test passes

## 7. Verification

- [x] 7.1 Run `dotnet test` — all server tests pass
- [x] 7.2 Run `npm test` — all client tests pass
- [x] 7.3 Build and run `docker compose up -d --build`
- [x] 7.4 Playtest: tap Daily Challenge from main menu, play and solve, verify stars/points on solved overlay, view leaderboard, play again for a better score
- [x] 7.5 Verify the daily resets: check that the countdown timer is correct and the puzzle changes at midnight UTC
- [x] 7.6 Verify activity feed shows the daily completion event in both English and German
- [x] 7.7 Verify campaign progress is unaffected after completing the daily
