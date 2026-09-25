# Tasks

## 1. Missed-star reasons

- [x] 1.1 Write `client/src/game/missedStarReasons.test.ts` covering every spec scenario (over par, slow, both, hint, 30.01s rounds to 0.1s, 3 stars returns empty, missing par/target skipped) and verify it fails
- [x] 1.2 Implement `missedStarReasons` in `client/src/game/missedStarReasons.ts` and verify `npm test -- missedStarReasons` passes

## 2. Overlays

- [x] 2.1 Add `en` and `de` strings for the three reasons (pluralised moves, seconds with one decimal) and verify `locale-parity.test.ts` passes
- [x] 2.2 Add a `MissedStars` component that renders nothing at 3 stars, with a test that it shows the reason lines at 1–2 stars and nothing at 3, and verify it passes
- [x] 2.3 Render `MissedStars` under the stars row in the `GameScreen.tsx` solved overlay and verify it with an `App.test.tsx`-style render test
- [x] 2.4 Render `MissedStars` under the stars row in the `DailyScreen.tsx` solved overlay using `completion.stars`, and verify it with a render test

## 3. Verify

- [x] 3.1 Run `cd client && npm test` and `npm run build` and verify both pass
- [ ] 3.2 Rebuild with `docker compose up -d --build`, solve a level over par and one slowly at http://localhost:8123, and verify the lines show at phone width
