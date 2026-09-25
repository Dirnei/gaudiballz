# Tasks

## 1. Share text

- [x] 1.1 Write `client/src/game/shareResult.test.ts` pinning the exact English text of both spec scenarios (daily and level), the 1-star/2-hint case, the no-hints case, and German output, and verify it fails
- [x] 1.2 Add `en` and `de` strings for the share titles and moves, and verify `locale-parity.test.ts` passes
- [x] 1.3 Implement `buildShareText` in `client/src/game/shareResult.ts` and verify `npm test -- shareResult` passes

## 2. Copying

- [x] 2.1 Move `copyText`/`fallbackCopy` from `GameScreen.tsx` into `client/src/game/clipboard.ts`, import it back into `GameScreen.tsx`, and verify existing level-code tests still pass

## 3. Overlays

- [x] 3.1 Add a Share result button to the `DailyScreen.tsx` solved overlay that copies the text and shows "Copied!" for 2 seconds, and verify it with a render test that clicks it and checks the clipboard text
- [x] 3.2 Add the same button to the `GameScreen.tsx` win screen, and verify it with an `App.test.tsx` render test that clicks it and checks the clipboard text
- [x] 3.3 Run `cd client && npm test` and `npm run build` and verify both pass
- [ ] 3.4 Rebuild with `docker compose up -d --build`, share a level and the daily at http://localhost:8123, and verify the pasted text matches the spec

## 4. Stored results (server)

- [x] 4.1 Write `SharingSliceTests` (Testcontainers) covering: campaign and daily completions return a `shareId`; `GET /api/v1/shares/{id}` returns the scored numbers, level code or date, board, current username and ball (and null for anonymous); rank position/total with the sharer's own entry excluded; `isToday`; 404 for an unknown id. Verify they fail
- [x] 4.2 Add `SharedResultDocument`, the `shared_results` collection, insert-with-retry, and the rank count queries to `PuzzleStore`, and verify store tests compile
- [x] 4.3 Return `shareId` from both completion endpoints and add `SharingSlice` with `GET /api/v1/shares/{id}`, registered in `Program.cs`, and verify `SharingSliceTests` and the existing server tests pass with `dotnet test`

## 5. Result page (client)

- [x] 5.1 Read `shareId` from both completion responses and make the share text link `<origin>/r/<shareId>`, and verify the updated share tests pass
- [x] 5.2 Write `SharedResultPage` tests: registered and anonymous attribution, stats lines, no hint line without hints, rank line, board preview, Play for a level unlocks via code and opens `/play`, today's daily opens `/daily`, ended daily shows the ended message, unknown id shows not-found. Verify they fail
- [x] 5.3 Implement `BoardPreview`, `SharedResultPage` and the `/r/:id` route with `en`/`de` strings, and verify the tests and `locale-parity.test.ts` pass
- [x] 5.4 Run `dotnet test` and `cd client && npm test && npm run build`, and verify all pass
- [ ] 5.5 Rebuild with `docker compose up -d --build`, finish a level and the daily at http://localhost:8123, open the copied links in a private window, and verify the page shows the result, board, rank and a working Play button
