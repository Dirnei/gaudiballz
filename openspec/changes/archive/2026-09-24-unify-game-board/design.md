# Design

## Context

See proposal.md for motivation. Today:

- Campaign: `useGame.ts` holds board state *and* identity, progress, scoring and account data.
  It runs once app-wide in `GameProvider` (`GameContext.tsx`), and `GameScreen.tsx` plus eight
  other screens read it through `useGameContext()`.
- Daily: `useDailyGame.ts` is a trimmed copy of the board half of `useGame`, called directly by
  `DailyScreen.tsx`. `DailyScreen` is a copy of `GameScreen`'s grid, drag, keyboard, footer and
  modals. `ControlButton`, `CooldownSweep`, `hintLabel` and `findVerticalNeighbour` are
  duplicated verbatim, and `isComplete` is redefined locally.
- Tutorial: `TutorialScreen.tsx` has its own `tapTube` on `startGame`/`play`. It renders `Tube`
  in one row with no drag or keyboard.
- The drift that exists is all in the daily and tutorial copies: the finished-column lock
  (`useDailyGame.ts:143,159`, `DailyScreen.tsx:213,317`) and drag hover in daily. The campaign
  copy is the reference behaviour.

## Goals / Non-Goals

**Goals:**
- Exactly one implementation of board interaction and board chrome, used by all three modes.
- Campaign behaviour and the `useGameContext()` API stay byte-for-byte compatible for other
  consumers.
- A structure where `multi-flask-selection` touches one hook and one component.

**Non-Goals:**
- Unifying solved overlays, completion submission or mode headers.
- Fixing the out-of-scope issues listed in the proposal (daily Play Again, solved-overlay keys,
  N/P, dead-verdict notice).
- Moving identity and progress out of `useGame`.

## Decisions

### 1. Composition: a shared hook plus a shared component, not one screen with a `mode` prop

- **`useBoardPlay(options)`** in `client/src/game/board/useBoardPlay.ts` owns:
  - `GameState`, `selected`, `tapTube`, `pour` and `clearSelection`
  - `undo` and `undosUsed`, the hint plan, `useHint`, `hinted` and the cooldown
  - the attempt budgets (`attempt.ts`), `noMoves`/`dead`/`stuck`, `moveCount`, the elapsed-timer
    start/stop effect, and `restart`

  Inputs:
  - `board: Board | null` and a `resetKey` that re-initialises everything when a new board loads
  - optional callbacks `onMove(move)` and `onRestart()`, which the campaign uses for
    `beginAttempt`, clearing the plan and reporting a restarted attempt
- **`<GameBoard game={...} controls={...} />`** in `client/src/game/board/GameBoard.tsx`
  renders:
  - the tube grid with its layout rule
  - `Tube`s with selected, focused, complete, drop-target and hover state
  - drag via `useDrag` + `DragOverlay`
  - the board keyboard handler: arrows, digits, Enter/Space, U/H/R and Escape-to-deselect
  - the moves/par/timer pill, the footer controls, the restart confirmation and the stuck
    notice

  `controls` picks which chrome is shown: `{ stats, undo, hint, restart, home }`. The tutorial
  passes none.
- Mode-specific keys stay with the mode through the `onKeyUnhandled(event)` prop: solved-overlay
  Enter/Escape and Escape-to-go-back when nothing is selected. `GameBoard` handles only board
  keys and passes everything else up.
- **Alternative rejected:** a single `PlayScreen` with `mode: 'campaign' | 'daily' |
  'tutorial'`. That is exactly the conditional sprawl the daily design forked to avoid.
  Composition keeps mode code outside the board.

### 2. `useGame` and `useDailyGame` become thin wrappers

- `useGame` calls `useBoardPlay`, spreads its result into the object it already returns, and
  keeps everything campaign-specific around it. Field names (`state`, `selected`, `tapTube`,
  `undosRemaining`…) do not change, so `GameContext` consumers and the mocked `useGame` in
  `dragIntegration.test.tsx` keep working.
- `useDailyGame` does the same with the daily fetch and submission.
- The tutorial calls `useBoardPlay` directly with its fixed board and no callbacks.
- Its step machine (`tutorial.ts`) advances from observed state: selection becomes non-empty →
  step 2; the move list becomes non-empty → free play. The step therefore does not depend on
  which input made the pour.

### 3. Shared small pieces

- `ControlButton`, `CooldownSweep` and `hintLabel` move to `client/src/game/board/controls.tsx`.
- `findVerticalNeighbour` moves into `GameBoard`.
- DailyScreen uses the existing `isComplete.ts`.

### 4. The campaign is the reference; drift resolves toward it

- Wherever copies differ in board behaviour, the campaign version wins: the finished lock on
  tap, keyboard and drag, drag hover, and `undosUsed` counting.
- The cooldown starts when an attempt begins, which is when `resetKey` changes, not when the
  board arrives. The campaign has always armed it the moment a level is opened, even offline,
  and `useGame.test` requires that. For daily, this moves the start from "after the fetch" to
  "when the page opens", a difference of one request's latency.

### 5. Parity is proven by tests, not by review

- One parameterised Vitest suite renders the campaign, daily and tutorial screens around the
  same fixed board, replays identical input sequences (tap, drag, keyboard), and asserts the
  same moves and selection.
- The suite checks what the `shared-game-board` spec promises. `multi-flask-selection` will add
  cases to it.

## Risks / Trade-offs

- [The refactor subtly changes campaign behaviour] → Extract in steps: first the hook, with
  `useGame.test`, `finishedColumnLock.test`, `dragIntegration.test` and `App.test` green before
  and after, then the component, then migrate daily, then the tutorial.
- [`useGame` re-renders more because the board hook's state lives inside the app-wide context]
  → It already holds this state today, so nothing changes. The hook is extracted, not lifted.
- [The tutorial's timing-sensitive prompts break with drag and keyboard] → Prompts are derived
  from state rather than from `tapTube` calls, and a tutorial test covers a drag pour.
- [Daily has no tests today, so its regressions are invisible] → The parity suite gives daily
  the same coverage as the campaign.
- [The mocked `useGame` in `dragIntegration.test.tsx` misses new fields such as
  `clearSelection`] → Update the mock factory as part of the hook-extraction task.

## Migration Plan

Client-only refactor, shipped as one deploy with no data migration. Rollback means reverting
the commit(s).
