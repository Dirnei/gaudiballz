# Tasks

## 1. Baseline

- [x] 1.1 Run `cd client && npm test`. Verify it is green and note the passing count as the baseline.

## 2. Shared board hook

- [x] 2.1 Create `client/src/game/board/useBoardPlay.ts` by extracting the board half of `useGame.ts`. It covers state, selection, tapTube, pour, clearSelection, undo/undosUsed, the hint plan/useHint/hinted/cooldown, the budgets, noMoves/dead/stuck, moveCount, the timer effect and restart, with `board`, `resetKey`, `onMove` and `onRestart` inputs. Verify it compiles with `npx tsc --noEmit`.
- [x] 2.2 Add `useBoardPlay.test.ts`. Cover: the finished-column lock on tap, redirecting the selection after an illegal pour, undo spending the budget, the hint cooldown starting when an attempt begins, and a reset on `resetKey` change. Verify the tests pass.
- [x] 2.3 Rewrite `useGame.ts` to compose `useBoardPlay` while keeping its returned API unchanged. Update the mock factory in `dragIntegration.test.tsx` for any new fields. Verify `useGame.test`, `finishedColumnLock.test`, `dragIntegration.test` and `App.test` pass unchanged.

## 3. Shared board component

- [x] 3.1 Move `ControlButton`, `CooldownSweep` and `hintLabel` into `client/src/game/board/controls.tsx`. Verify no copies remain with `grep -rn "function ControlButton" client/src`, which should print one hit.
- [x] 3.2 Create `client/src/game/board/GameBoard.tsx` from GameScreen's grid, tubes, drag (with hover), board keyboard handler (with `onKeyUnhandled`), stats pill, footer, restart confirmation and stuck notice. The `controls` prop toggles each piece of chrome. Verify with `npx tsc --noEmit`.
- [x] 3.3 Switch `GameScreen.tsx` to render `<GameBoard>` and keep only campaign surroundings: badge, header, toasts, leave prompt and solved overlay. Verify all campaign tests pass and the diff of GameScreen removes the duplicated blocks.

## 4. Daily on the shared board

- [x] 4.1 Rewrite `useDailyGame.ts` to compose `useBoardPlay` and keep only fetch, `alreadyDone`, submission and `completion`. Verify with `npx tsc --noEmit`.
- [x] 4.2 Switch `DailyScreen.tsx` to `<GameBoard>` and remove its local `isComplete`, `ControlButton`, `CooldownSweep`, `hintLabel` and keyboard/drag code. Verify that `grep -n "function isComplete\|findVerticalNeighbour" client/src/game/DailyScreen.tsx` prints nothing.

## 5. Tutorial on the shared board

- [x] 5.1 Switch `TutorialScreen.tsx` to `useBoardPlay` + `<GameBoard controls={{}}>`, and derive the tutorial step from selection and move-list state. Verify the existing `TutorialScreen.test.tsx` and `tutorial.test.ts` pass.
- [x] 5.2 Add tutorial tests: a drag pour advances to free play, a keyboard pour works, and no undo, hint, restart, timer or move counter is rendered. Verify the tests pass.

## 6. Parity

- [x] 6.1 Add `boardParity.test.tsx`. It renders the campaign, daily and tutorial around one fixed board and replays identical tap, drag and keyboard sequences, asserting equal moves and selection. Include the finished-column lock and the drop-hover highlight cases for daily. Verify the tests pass.

## 7. Ship

- [x] 7.1 Run the full `cd client && npm test` and `npm run build`. Verify both are green and the test count is at least the baseline plus the new tests.
- [x] 7.2 Rebuild with `docker compose up -d --build`. Playtest campaign, daily and tutorial on http://localhost:8123 by tap, drag and keyboard. Verify daily refuses to pick up a finished column and the tutorial accepts drag.
