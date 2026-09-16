## 0. Unblock the wallet actor

- [x] 0.1 Remove the unbound `event-adapters` block from the journal config in `Program.cs` — `IdentityEventAdapter` has no public parameterless constructor, so the journal plugin actor dies on creation and every persistent actor, including the wallet, fails to start

## 1. Progress API

- [x] 1.1 Modify the progress GET endpoint in `ProgressionSlice` to Ask the wallet for `GetBalance` with a 2-second timeout, falling back to `snapshot.Progress.TotalPoints` on failure
- [x] 1.2 Verify rank computation in the progress response uses the wallet-derived total

## 2. Leaderboard upsert

- [x] 2.1 Modify the fire-and-forget block in `ProgressionSlice` to Ask the wallet for `GetBalance` with a 2-second timeout, falling back to `updatedProgress.TotalPoints + bonus.Total`
- [x] 2.2 Pass the wallet balance (or fallback) to `UpsertLeaderboardAsync` as `totalPoints`

## 3. Hub player-stats endpoint

- [x] 3.1 Modify the `/api/hub/player/stats` endpoint in `HubSlice` to Ask the wallet for `GetBalance`, falling back to `progress.TotalPoints`
- [x] 3.2 Use the wallet balance for rank computation in the response

## 4. Tests

- [x] 4.1 Write tests verifying the progress endpoint returns the wallet balance when available
- [x] 4.2 Write tests verifying the progress endpoint falls back to progress-derived total on wallet timeout
- [x] 4.3 Write tests verifying the leaderboard upsert uses the wallet balance

## 5. End-to-end verification

- [x] 5.1 Run `dotnet test` — all tests pass
- [x] 5.2 Rebuild Docker image and verify at http://localhost:8123
- [x] 5.3 Complete a level, verify XP matches wallet balance
- [x] 5.4 Verify leaderboard reflects wallet balance
