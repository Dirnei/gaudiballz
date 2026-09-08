## 1. Star calculation and time target (domain library)

- [x] 1.1 Write tests for star calculation: 3-star, 2-star, 1-star, hint-capped, edge cases (exactly at par, exactly at time target, zero hints, null elapsed time)
- [x] 1.2 Implement `Scoring.CalculateStars(moves, hints, elapsedTimeMs, par, timeTargetMs)` as a static method in `Puzzle.Rules` returning `(Stars, Points)`
- [x] 1.3 Write tests for time target derivation: 2-spare regime (`par × 3s`), 1-spare regime (`par × 4s`), boundary at level 50
- [x] 1.4 Add `TimeTargetMs(int levelId)` method to `LevelCatalogue` computing the time target from par and spare-tube regime

## 2. LevelResult and PlayerProgress extension

- [x] 2.1 Write tests for extended `LevelResult.Best()`: min(moves), min(hints), max(stars), max(points) across two results
- [x] 2.2 Extend `LevelResult` to `LevelResult(Moves, Hints, Stars, Points)` and update `Best()` fold
- [x] 2.3 Write tests for `PlayerProgress.TotalPoints` (sum of best points across levels)
- [x] 2.4 Add `TotalPoints` computed property to `PlayerProgress`
- [x] 2.5 Verify existing MongoDB documents deserialize with `Stars=0, Points=0` defaults

## 3. Server — completion endpoint and levels endpoint

- [x] 3.1 Write integration test: POST completion with `ElapsedTimeMs`, verify response includes `stars`, `points`, `attemptStars`, `attemptPoints`
- [x] 3.2 Add `ElapsedTimeMs` (nullable int) to `CompletionRequest`
- [x] 3.3 Compute stars in the completion handler using `Scoring.CalculateStars` and the level's par/time target, persist via extended `LevelResult`
- [x] 3.4 Update completion response shape to include `stars`, `points`, `attemptStars`, `attemptPoints`
- [x] 3.5 Write integration test: POST completion without `ElapsedTimeMs`, verify max 2 stars achievable
- [x] 3.6 Add `timeTargetMs` to `GET /api/v1/levels/{levelId}` response
- [x] 3.7 Update progress GET response shape to include `stars`, `points` per level and `totalPoints`

## 4. Server — merge endpoint

- [x] 4.1 Write test: merge with stars/points fields, verify higher stars win per level
- [x] 4.2 Add optional `Stars` and `Points` to `MergeEntry`, defaulting to 0
- [x] 4.3 Verify merge response includes stars/points and totalPoints

## 5. Client — elapsed time timer

- [x] 5.1 Write tests for the timer hook: starts on first move, pauses on hidden, resumes on visible, resets on restart, stops on completion, pauses during overlays
- [x] 5.2 Implement `useElapsedTime` hook using `performance.now()` with `startedAt` and `accumulatedMs` pattern
- [x] 5.3 Wire timer into `useGame`: start on first tap, pause on visibility change and overlay open, resume on overlay close, stop on solve, reset on restart

## 6. Client — completion payload and progress types

- [x] 6.1 Add `elapsedTimeMs` to the completion payload in `recordCompletion` and the offline queue schema
- [x] 6.2 Update `ProgressEntry` and `Progress` types to include `stars`, `points`, and add `totalPoints` to `Progress`
- [x] 6.3 Parse `attemptStars` and `attemptPoints` from the completion response in `useGame`

## 7. Client — win screen star display

- [x] 7.1 Add star icons (filled/empty) to the win screen showing the attempt's star rating and points
- [x] 7.2 Show "new best" indicator when the attempt improved the level's best star rating
- [x] 7.3 When the attempt did not improve, show the attempt rating and indicate the existing best

## 8. Client — level-select stars

- [x] 8.1 Replace the raw move count on completed tiles in `LevelSelect` with 1–3 star icons based on `entry.stars`
- [x] 8.2 Show no stars on uncompleted tiles (preserve existing locked/unlocked/current states)

## 9. Docker rebuild and manual verification

- [x] 9.1 Rebuild the Docker image and verify the game starts
- [ ] 9.2 Play through a level under par with no hints and fast time — verify 3 stars on win screen and level-select tile
- [ ] 9.3 Play through a level over par — verify 1 star
- [ ] 9.4 Play through a level using a hint — verify 1 star cap
- [ ] 9.5 Replay a completed level and verify best-star persistence
