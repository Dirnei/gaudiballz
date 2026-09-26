# Tasks

## 1. Streak computation

- [x] 1.1 Write failing unit tests for `Streaks.Compute`: existing behaviour (broken streak, several completions per day, today/yesterday alive) plus every `streak-freeze` scenario (1- and 2-day covers, gap > held keeps freezes, frozen day doesn't add, best streak spans a frozen day, today not missed). Verify they fail.
- [x] 1.2 Implement `Streaks.Compute` in `Progression/` as a pure function taking `today`, and verify the 1.1 tests pass.
- [x] 1.3 Replace `HubSlice.CalculateStreak`/`CalculateBestStreak` and `AchievementCatalogue.CurrentStreak` with `Streaks.Compute`, and verify the existing Server tests still pass.

## 2. Freeze state and settlement

- [x] 2.1 Write failing integration tests (Testcontainers Mongo) for settlement: earn on day 7/14, cap at 2 with loss at 21, several completions on day 7 earn one, gap covered spends freezes, gap too long spends none, daily-challenge completion settles too. Verify they fail.
- [x] 2.2 Add `StreakFreezeDocument` and the `streak_freeze` collection, and implement `PuzzleStore.SettleStreakAsync` with the `SettledThrough` gate and `Version` filter. Verify the 2.1 tests pass.
- [x] 2.3 Call settlement after `RecordDailyPlayAsync` on campaign and daily completions, and verify it with an integration test that completes a level through the API across simulated days.
- [x] 2.4 Write and pass a test that fires two completions for one player in parallel on a day-7 streak and asserts exactly one freeze is earned.
- [x] 2.5 Pass frozen days into the achievement context so `streak-*` uses the bridged streak. Verify with a test: a 6-day streak, a covered day, then a completion awards `streak-7`, and full-week is not awarded for a frozen day.
- [x] 2.6 Confirm the frozen day earns no streak-day XP bonus (no ledger entry) with a wallet ledger assertion.

## 3. API

- [x] 3.1 Write a failing endpoint test, then add `streakFreezes` and `streakSavedDays` to `/api/hub/player/stats`. Verify with the test, including the "covered before playing again" read.
- [x] 3.2 Confirm anonymous players can read the streak fields and that linking an account keeps freezes. Add a test for each, and a route or carry-over if one fails.

## 4. Client

- [x] 4.1 Write failing tests for `ProgressTiles` (freeze indicator at 1 and 2 held, none at 0) and `StatsPage` (freezes shown with the streak), then implement. Verify with `npm test`.
- [x] 4.2 Write failing tests for the home-page "streak saved" notice (shown when `streakSavedDays > 0`, dismissal persisted per gap anchor, absent otherwise), then implement it with no other prompts. Verify with `npm test`.
- [x] 4.3 Add i18n strings for the freeze indicator and notice in every supported locale, and verify the i18n key-coverage test passes.

## 5. Ship

- [x] 5.1 Run `dotnet test`, `npm test` and `openspec validate --all --strict`, and verify all pass.
- [x] 5.2 Rebuild with `docker compose up -d --build` and check on http://localhost:8123 that the streak tile, stats view and notice render correctly with seeded frozen-day data.
