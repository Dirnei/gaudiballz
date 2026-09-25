# Tasks

## 1. Replay in the rules engine

- [x] 1.1 Write `ReplayTests` in `GaudiBallz.Rules.Tests`: every `replay-inputs.json` entry whose moves end solved verifies as Solved; an illegal move reports its index and rejection; a legal-but-unsolved list reports NotSolved; an empty list on an unsolved board is NotSolved. Verify they fail
- [x] 1.2 Implement `Replay.Verify(IRuleSet, Board, IReadOnlyList<Move>)` using only `TryApply`/`IsSolved`, and verify `dotnet test src/GaudiBallz.Rules.Tests` passes, including the conformance category

## 2. Server verification

- [x] 2.1 Write integration tests (Testcontainers) for `POST /api/v1/progress/completions`: a real solution (built by solving `LevelCatalogue.Build(n)` with the constructive solution) is accepted and scored on the claimed count; illegal move, not solved, count below list length, over 2000 moves and unknown rules version each return 400 with their code and leave progress, level leaderboard and shared results unchanged; a request without `moveList` is accepted and its shared result has `moves: null`. Verify they fail
- [x] 2.2 Add the same accept/reject tests for `POST /api/v1/daily/completions`, using `DailyChallenge.BoardForDate(today)`'s constructive solution, and verify they fail
- [x] 2.3 Add `moveList`/`rulesVersion` to both request records, cache the daily board per date, run the checks before any write in both endpoints, and verify the tests from 2.1 and 2.2 pass
- [x] 2.4 Store `MoveList` and `Verified` on `SharedResultDocument`, return `moveList` from `GET /api/v1/shares/{id}`, extend `SharingSliceTests` to assert a verified result returns its list and a legacy one returns null, and verify all server tests pass with `dotnet test`
- [x] 2.5 Update existing server tests that post completions without a real solution so they send a valid `moveList` (or deliberately test the legacy path), and verify the full `dotnet test` run passes (kept on the legacy path deliberately: they post made-up counts without a `moveList`, which is exactly the older-build path; real move lists are covered by `CompletionVerificationTests` and `SharingSliceTests`)

## 3. Client submission

- [x] 3.1 Write a test that plays a level with an undo, a hint and a multi-pour through `useBoardPlay`, then replays the submitted `moveList` with the TS engine and asserts it ends solved, with undone moves absent and the hint move present. Verify it fails
- [x] 3.2 Send `moveList` (from `state.moves`) and `rulesVersion` from `useGame` via `recordCompletion`/`PendingCompletion` and from `useDailyGame`, and verify the test from 3.1 and the existing `completionQueue`/`progress` tests pass
- [x] 3.3 Add a `progress.ts` test that a queued item without `moveList` is still sent (legacy) and one rejected with 400 is forgotten, and verify it passes

## 4. Replay on the result page

- [x] 4.1 Write `useReplay` tests (fake timers): starts on the starting board at move 0; plays one move per 600 ms and stops solved; pause/resume; restart returns to move 0; next/prev step by one; with reduced motion, play does not auto-advance. Verify they fail
- [x] 4.2 Implement `useReplay`, and verify its tests pass
- [x] 4.3 Extend `SharedResultPage` tests: Watch replay is offered only when `moves` is present; "Move n of total" updates while stepping; the undone-moves note appears when `moves` (count) exceeds the list length; the reduced-motion variant shows previous/next instead of play. Verify they fail
- [x] 4.4 Add replay controls and the `highlight` prop to `BoardPreview` and `SharedResultPage`, with `en`/`de` strings, and verify the tests and `locale-parity.test.ts` pass

## 5. Verify

- [x] 5.1 Run `dotnet test` and `cd client && npm test && npm run build`, and verify all pass
- [ ] 5.2 Rebuild with `docker compose up -d --build`, finish a level with an undo and a hint at http://localhost:8123, open its result link, watch the replay end on a solved board, and check the reduced-motion variant with the OS setting on
