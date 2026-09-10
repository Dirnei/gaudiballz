## 1. Server — Document Model

- [x] 1.1 Add `int? ProfileBall` field to `LeaderboardDocument` in `Documents.cs`; register with `SetIgnoreIfNull(true)` in BSON map
- [x] 1.2 Add `int? ProfileBall` field to `ActivityFeedDocument` in `Documents.cs`; register with `SetIgnoreIfNull(true)`
- [x] 1.3 Add `int? ProfileBall` field to `DailyResultDocument` in `Documents.cs`; register with `SetIgnoreIfNull(true)`

## 2. Server — Write the Ball into Documents

- [x] 2.1 Update `UpsertLeaderboardAsync` in `PuzzleStore.cs` to accept and store `profileBall`; update all call sites in `ProgressionSlice.cs` to pass the player's current `ProfileBall`
- [x] 2.2 Update `RecordStructuredActivityAsync` in `PuzzleStore.cs` to accept and store `profileBall`; update all call sites (ProgressionSlice, DailySlice) to pass the player's `ProfileBall`
- [x] 2.3 Update `UpsertDailyResultAsync` in `PuzzleStore.cs` to accept and store `profileBall`; update the call site in `DailySlice.cs`
- [x] 2.4 In `ProfileBallSlice.cs`, after saving the ball choice via `SetProfileBallAsync`, also update all existing `LeaderboardDocument` entries for that player (UpdateMany by PlayerId, set ProfileBall)

## 3. Server — API Responses

- [x] 3.1 Add `ball` field to leaderboard entry responses in `HubSlice.cs` (`GET /api/hub/leaderboard`)
- [x] 3.2 Add `ball` field to activity feed event responses in `HubSlice.cs` (`GET /api/hub/activity-feed`)
- [x] 3.3 Add `ball` field to daily leaderboard entry responses in `DailySlice.cs` (`GET /api/v1/daily/leaderboard`)

## 4. Server — Tests

- [x] 4.1 Write tests: leaderboard entry includes `ball` after completion, activity feed event includes `ball`, daily leaderboard includes `ball`, changing ball updates leaderboard entries

## 5. Client — Unified Ball Rendering

- [x] 5.1 Add a `ballDotStyle(colour: number)` helper to `skins/index.ts` (or `profileBall.ts`) that returns a CSS background gradient for a small dot — using the canonical `PALETTE` colours, not the duplicate gradient array
- [x] 5.2 Update `LeaderboardPage.tsx`: add `ball: number | null` to `LeaderboardEntry` interface, remove the local `BALL_COLORS`/`ballColor` function, render each player's dot using `ballDotStyle(ballForAccount(e.ball, e.username))`
- [x] 5.3 Update `ActivityFeed.tsx`: add `ball: number | null` to `FeedEvent` interface, remove the local `BALL_COLORS`/`ballColor` function, render using `ballDotStyle(ballForAccount(ev.ball, ev.username))`
- [x] 5.4 Update `DailyLeaderboard.tsx`: add `ball: number | null` to `DailyLeaderboardEntry` interface, remove the local `BALL_COLORS`/`ballColor` function, render using `ballDotStyle(ballForAccount(e.ball, e.username))`

## 6. Verification

- [x] 6.1 Run `dotnet test` — all server tests pass
- [x] 6.2 Run `npm test` — all client tests pass
- [x] 6.3 Build and run `docker compose up -d --build`
- [x] 6.4 Playtest: choose a profile ball, verify it appears on the leaderboard, activity feed, and daily leaderboard with the correct colour
- [x] 6.5 Verify that a player who has not chosen a ball shows the name-derived colour consistently across all views
