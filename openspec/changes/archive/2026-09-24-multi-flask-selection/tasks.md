# Tasks

## 1. Prerequisite

- [x] 1.1 Confirm `unify-game-board` is implemented and archived. Verify that `client/src/game/board/useBoardPlay.ts` and `GameBoard.tsx` exist and `cd client && npm test` is green.

## 2. Grouped history

- [x] 2.1 Add `steps` to `GameState` in `client/src/engine/history.ts`, add `playGroup`, and make `undo` pop a whole step. Verify with new `history.test.ts` cases: a single move still undoes one, a group of 3 undoes as one with `moves` shrinking by 3, and a group with an illegal move returns the same state.

## 3. Tap resolver

- [x] 3.1 Implement `client/src/game/board/resolveTap.ts` following design decision 1. Verify with table-driven `resolveTap.test.ts` on real boards. Cover every scenario in `specs/multi-flask-selection/spec.md`: join, chain join, different colour, finished never joins, partly filled first pick, empty target, fitting target, partial fit redirect, mismatch redirect, single-selection partial pour, and tap-selected-clears.

## 4. Wire into the shared board

- [x] 4.1 Change `selected` in `useBoardPlay` to `readonly number[]`, route `tapTube` through `resolveTap` (a group pour uses `playGroup`), add a group's length to the move counter (undo never lowers it), and fix every `selected !== null` use. Verify with `npx tsc --noEmit` and the existing `useBoardPlay`/`useGame` tests.
- [x] 4.2 In `GameBoard`, pass `selected.includes(i)` to `Tube`, use `clearSelection` for Escape and drag start, and keep digit/Enter/Space going through `tapTube`. Verify the `dragIntegration` and keyboard tests pass after updating the mock's `selected` to an array.
- [x] 4.3 Add hook tests: a three-flask pour gives move count 3 and moves in selection order, one undo restores the board, the move count stays 3, and exactly one undo is spent. Verify the tests pass.

## 5. Modes and parity

- [x] 5.1 Extend `boardParity.test.tsx` with a multi-select join-and-pour sequence by tap and by keyboard in campaign and daily (the fixed tutorial board cannot form a multi-selection; the existing three-mode sequence keeps covering it). Verify identical results in both.
- [x] 5.2 Add a `Tube`/`GameBoard` render test in which two selected flasks both render raised with `aria-pressed="true"`. Verify the test passes.

## 6. Ship

- [x] 6.1 Run the full `cd client && npm test` and `npm run build`, and verify both are green. Also run `dotnet test src/GaudiBallz.Rules.Tests -- --filter-trait "Category=Conformance"` and `npm run test:conformance` to confirm no rules drift.
- [x] 6.2 Rebuild with `docker compose up -d --build`. On http://localhost:8123, start a fresh level, select two or three full flasks with the same top colour, and tap the empty flask. Verify they all pour, one undo reverts them, and the same works in daily and the tutorial.
