## 1. Attempt outcomes in the journal entity

- [ ] 1.1 Add `AttemptRestarted` and `AttemptAbandoned` events alongside `LevelCompleted`, each carrying the player, level, attempt id and timestamp
- [ ] 1.2 Add an `EndAttempt` command (player, level, attempt id, outcome) to `CompletionJournalActor`, persisting the matching event
- [ ] 1.3 Hold `(Attempts, Completions)` and the set of closed attempt ids in the actor's state, rebuilt on recovery, and ignore an ending for an attempt id already closed
- [ ] 1.4 Add a `GetAttemptCounts` query answering `AttemptCounts(Attempts, Completions)`, mirroring how the wallet answers `GetBalance`
- [ ] 1.5 Count the existing `JournalCompletion` command as a completed attempt, so a clear and a loss both flow through the same counters
- [ ] 1.6 Snapshot the counts so recovery does not replay the whole journal on a long-lived player
- [ ] 1.7 Write actor tests: outcomes accumulate, a duplicate ending is ignored, counts survive recovery from the journal and from a snapshot

## 2. Reporting endpoint

- [ ] 2.1 Add `POST /api/v1/progress/attempts/end` taking level, attempt id and outcome, forwarding to the journal region
- [ ] 2.2 Accept the player token in the body as well as the Authorization header, because `sendBeacon` cannot set headers
- [ ] 2.3 Return success for an already-closed attempt id rather than an error, so a retry or a duplicate beacon is harmless
- [ ] 2.4 Have the completion endpoint pass the attempt id through to the journal so completions close the same attempt the client opened
- [ ] 2.5 Write endpoint tests: an abandon is recorded, a restart is recorded, a duplicate ending changes nothing, an unauthenticated call is rejected

## 3. Leaderboard and stats read the counts

- [ ] 3.1 In the completion fire-and-forget block, Ask the journal for attempt counts alongside the wallet balance, with the same timeout and fallback shape
- [ ] 3.2 Pass those counts to `UpsertLeaderboardAsync` as `gamesPlayed` and `gamesWon`
- [ ] 3.3 Add the missing `GamesWon` increment to `UpsertPeriodLeaderboardAsync`
- [ ] 3.4 Move the period upsert out from behind the `earnedThisAttempt > 0` check so a lost attempt still counts toward the period
- [ ] 3.5 Upsert the leaderboard row on an abandoned or restarted attempt too, so a loss is reflected without waiting for the next completion
- [ ] 3.6 Compute `winRate` in `/api/hub/player/stats` from the journal counts, and report it and `gamesPlayed`/`gamesWon` from the same source
- [ ] 3.7 Report win rate as absent rather than `0` when a player has no recorded attempts, on both the leaderboard and the stats endpoint
- [ ] 3.8 Write tests covering the win-rate scenarios in the specs, including the restart-then-clear case and the no-attempts case

## 4. Client: attempt lifecycle

- [ ] 4.1 Generate an attempt id when a level is opened, and a fresh one on each restart
- [ ] 4.2 Report the ended attempt as restarted when the player restarts, before the new attempt begins
- [ ] 4.3 Pass the current attempt id with the completion request
- [ ] 4.4 Track whether the current attempt is unfinished, so a completed level is not treated as abandonable

## 5. Client: leaving a level

- [ ] 5.1 Block in-app navigation away from an unfinished attempt with `useBlocker` and show a modal stating that leaving counts as a loss
- [ ] 5.2 On confirm, report the attempt abandoned and let the navigation proceed; on cancel, stay with the board untouched
- [ ] 5.3 Register a `beforeunload` handler while an attempt is unfinished, and report the abandonment with `navigator.sendBeacon`
- [ ] 5.4 Remove both the blocker and the handler once an attempt ends, so leaving after a completion warns about nothing
- [ ] 5.5 Add the modal's strings to `en.json` and `de.json`
- [ ] 5.6 Write client tests: the modal appears for an unfinished attempt and not after a completion, confirm reports and navigates, cancel does neither

## 6. Client: showing the rate

- [ ] 6.1 Render a dash rather than 0% where a win rate is absent, in `LeaderboardPage` and the stats view
- [ ] 6.2 Update the client tests that assume a numeric win rate is always present

## 7. Verification

- [ ] 7.1 Run `dotnet test` — all tests pass
- [ ] 7.2 Run `cd client && npm test` — all tests pass
- [ ] 7.3 Rebuild the Docker image and verify at http://localhost:8123
- [ ] 7.4 Play a level start to finish: one attempt, one win, 100%
- [ ] 7.5 Restart mid-level then finish: two attempts, one win, 50%
- [ ] 7.6 Navigate to the menu mid-level: the modal appears, confirming records a loss, cancelling records nothing
- [ ] 7.7 Close the tab mid-level, reopen, and confirm the attempt was recorded as a loss
- [ ] 7.8 Confirm the Today and This Week leaderboards show a real win rate rather than 0%
- [ ] 7.9 Confirm a player with no attempts since the deploy shows a dash rather than 0%
