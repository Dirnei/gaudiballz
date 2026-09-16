## 1. Attempt outcomes in the journal entity

- [x] 1.1 Add `AttemptRestarted` and `AttemptAbandoned` events alongside `LevelCompleted`, each carrying the player, level, attempt id and timestamp
- [x] 1.2 Add an `EndAttempt` command (player, level, attempt id, outcome) to `CompletionJournalActor`, persisting the matching event
- [x] 1.3 Hold `(Attempts, Completions)` and the set of closed attempt ids in the actor's state, rebuilt on recovery, and ignore an ending for an attempt id already closed
- [x] 1.4 Add a `GetAttemptCounts` query answering `AttemptCounts(Attempts, Completions)`, mirroring how the wallet answers `GetBalance`
- [x] 1.5 Count the existing `JournalCompletion` command as a completed attempt, so a clear and a loss both flow through the same counters
- [x] 1.6 Snapshot the counts so recovery does not replay the whole journal on a long-lived player
- [x] 1.7 Write actor tests: outcomes accumulate, a duplicate ending is ignored, counts survive recovery from the journal and from a snapshot

## 2. Reporting endpoint

- [x] 2.1 Add `POST /api/v1/progress/attempts/end` taking level, attempt id and outcome, forwarding to the journal region
- [x] 2.2 Accept the player token in the body as well as the Authorization header, because `sendBeacon` cannot set headers
- [x] 2.3 Return success for an already-closed attempt id rather than an error, so a retry or a duplicate beacon is harmless
- [x] 2.4 Have the completion endpoint pass the attempt id through to the journal so completions close the same attempt the client opened
- [x] 2.5 Write endpoint tests: an abandon is recorded, a restart is recorded, a duplicate ending changes nothing, an unauthenticated call is rejected

## 3. Leaderboard and stats read the counts

- [x] 3.1 In the completion fire-and-forget block, Ask the journal for attempt counts alongside the wallet balance, with the same timeout and fallback shape
- [x] 3.2 Pass those counts to `UpsertLeaderboardAsync` as `gamesPlayed` and `gamesWon`
- [x] 3.3 Add the missing `GamesWon` increment to `UpsertPeriodLeaderboardAsync`
- [x] 3.4 Move the period upsert out from behind the `earnedThisAttempt > 0` check so a lost attempt still counts toward the period
- [x] 3.5 Upsert the leaderboard row on an abandoned or restarted attempt too, so a loss is reflected without waiting for the next completion
- [x] 3.6 Compute `winRate` in `/api/hub/player/stats` from the journal counts, and report it and `gamesPlayed`/`gamesWon` from the same source
- [x] 3.7 Report win rate as absent rather than `0` when a player has no recorded attempts, on both the leaderboard and the stats endpoint
- [x] 3.8 Write tests covering the win-rate scenarios in the specs, including the restart-then-clear case and the no-attempts case

## 4. Client: attempt lifecycle

- [x] 4.1 Generate an attempt id when a level is opened, and a fresh one on each restart
- [x] 4.2 Report the ended attempt as restarted when the player restarts, before the new attempt begins
- [x] 4.3 Pass the current attempt id with the completion request
- [x] 4.4 Track whether the current attempt is unfinished, so a completed level is not treated as abandonable

## 5. Client: leaving a level

- [x] 5.1 Block in-app navigation away from an unfinished attempt with `useBlocker` and show a modal stating that leaving counts as a loss
- [x] 5.2 On confirm, report the attempt abandoned and let the navigation proceed; on cancel, stay with the board untouched
- [x] 5.3 Register a `beforeunload` handler while an attempt is unfinished, and report the abandonment with `navigator.sendBeacon`
- [x] 5.4 Remove both the blocker and the handler once an attempt ends, so leaving after a completion warns about nothing
- [x] 5.5 Add the modal's strings to `en.json` and `de.json`
- [x] 5.6 Write client tests: the modal appears for an unfinished attempt and not after a completion, confirm reports and navigates, cancel does neither

## 6. Client: showing the rate

- [x] 6.1 Render a dash rather than 0% where a win rate is absent, in `LeaderboardPage` and the stats view
- [x] 6.2 Update the client tests that assume a numeric win rate is always present

## 8. An attempt starts with the first move

- [x] 8.1 Track whether the current attempt has had a move, resetting it when a new attempt begins
- [x] 8.2 Treat an attempt as at stake only once it has been played, so an untouched level warns about nothing and records nothing on the way out
- [x] 8.3 Leave restarting an untouched board recording nothing, since no attempt had begun
- [x] 8.4 Write tests: opening and leaving records nothing, moving then leaving records a loss

## 7. Verification

- [x] 7.1 Run `dotnet test` — all tests pass
- [x] 7.2 Run `cd client && npm test` — all tests pass
- [x] 7.3 Rebuild the Docker image and verify at http://localhost:8123
- [x] 7.4 Play a level start to finish: one attempt, one win, 100%
- [x] 7.10 Open a level, make no move, leave: no modal and no attempt recorded
- [x] 7.5 Restart mid-level then finish: two attempts, one win, 50%
- [x] 7.6 Navigate to the menu mid-level: the modal appears, confirming records a loss, cancelling records nothing
- [x] 7.7 Close the tab mid-level, reopen, and confirm the attempt was recorded as a loss
- [x] 7.8 Confirm the Today and This Week leaderboards show a real win rate rather than 0%
- [x] 7.9 Confirm a player with no attempts since the deploy shows a dash rather than 0%
