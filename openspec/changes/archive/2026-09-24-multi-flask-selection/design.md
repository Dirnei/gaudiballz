# Design

## Context

See proposal.md for motivation and specs/multi-flask-selection/spec.md for the behaviour.

This design assumes `unify-game-board` has landed. All board interaction then lives in
`useBoardPlay` (`client/src/game/board/useBoardPlay.ts`) and `<GameBoard>`, which campaign,
daily and tutorial all use, so this change is made once.

Relevant constraints:
- The server verifies a completion by replaying the submitted move list with the shared rules.
  A multi-pour must therefore be expressible as ordinary moves.
- `history.ts` keeps one board snapshot per move, and `undo` pops one.
- `Tube` already has a `selected` boolean prop with a raised style and `aria-pressed`.

## Goals / Non-Goals

**Goals:**
- A pure, exhaustively testable decision function for what a tap does.
- Grouped undo without changing what is submitted.

**Non-Goals:**
- Any rules-engine, C# or conformance change. A multi-pour is only a client convenience.
- Multi-selection by drag.
- Animating the pours as one combined flight. Each move animates as it does today.

## Decisions

### 1. A pure tap resolver

`client/src/game/board/resolveTap.ts`:

```ts
type TapOutcome =
  | { kind: 'select'; selected: number[] }   // includes [] for "clear"
  | { kind: 'pour'; moves: Move[] };

function resolveTap(board: Board, selected: readonly number[], index: number): TapOutcome
```

Decision order, which mirrors the spec:

1. `index` is in `selected` → `select []`.
2. Nothing selected → `select [index]` if pick-up-able (non-empty, not finished), else `[]`.
   This keeps the finished-column lock.
3. `index` is full, not finished, and `topColour(index) === topColour(selected[0])` →
   `select [...selected, index]`.
4. Exactly one selected → `pour [{from: selected[0], to: index}]` if `isLegal`. Otherwise
   redirect: `select [index]` if pick-up-able, else `[]`.
5. Two or more selected → let `need = Σ topRunLength(selected[i])`. If `index` is empty, or
   `topColour(index)` matches and `capacity - length ≥ need`, then `pour` one move per selected
   flask in selection order. Otherwise redirect as in step 4.

Every move in a group pour is legal in sequence. Each move lands on the same colour, and the fit
check guarantees there is space. Pouring into an empty flask always fits: every colour appears
exactly `capacity` times, so the matching top runs sum to at most `capacity`.

- **Why pure:** the rule has many branches and edge cases (finished, empty, partial fit). A pure
  function over real boards gets table-driven tests with no hook harness, following the
  project's "no mocks for rules" convention.
- **Alternative rejected:** growing the branching inside `tapTube`. That is what drifted three
  ways before `unify-game-board`.

### 2. `selected` becomes `readonly number[]`

- `useBoardPlay` stores an ordered array. The order is the selection order, which is the pour
  order.
- `GameBoard` passes `selected={selected.includes(i)}` to `Tube`.
- The keyboard handler uses `clearSelection()` for Escape, and Escape falls through to the mode
  only when the array is empty.
- The drag start path calls `clearSelection()` as it does today.
- Anything that checked `selected !== null` now checks `selected.length > 0`: the timer start,
  the Escape chain, the running flag and the tutorial step.
- `useGame`'s public field keeps the name `selected`. Its type changes, and the few consumers
  outside the board are updated.
- **Alternative rejected:** keeping `selected: number | null` plus an `extra: number[]`. That
  makes two sources of truth for one concept.

### 3. Grouped undo via step sizes in `history.ts`

`GameState` gains `steps: readonly number[]`, the number of moves in each undo step, alongside
`history`. The `history` entries become one board snapshot per *step*.

- `play(state, move)` pushes a snapshot and `steps.push(1)`, so current behaviour is unchanged.
- New `playGroup(state, moves)` applies the moves in order. If any move is illegal it returns
  `state` unchanged, so the group is atomic. Otherwise it pushes one snapshot (the board before
  the group) and `steps.push(moves.length)`.
- `undo` pops one snapshot and removes the last `steps.at(-1)` moves. `canUndo` and `restart` are
  unchanged (`history[0]` is still the initial board).
- `moves` stays the flat list that is submitted, so server verification is untouched.
- The undo budget is spent once per `undo()` call, so a group costs one undo automatically.
- `moveCount` stays the separately incremented counter. A group pour adds its length, and
  undo never lowers it, as for every undo today. Undone moves have always counted towards par
  and stars, and multi-select does not change that.
- **Alternative rejected:** snapshot per move plus group markers. That doubles the bookkeeping
  for no benefit.

### 4. Pour side effects

- A group pour behaves like one player action. The hint plan is cleared once, `onMove` fires per
  move (the campaign only needs the first to open the attempt), and the selection clears.
- Haptics and win detection run off the resulting state, as today.

### 5. Tutorial

- Derived-state steps (from `unify-game-board`) already handle this. A multi-selection counts
  as "selected", and a group pour makes the move list non-empty, so the step advances to free
  play.

## Risks / Trade-offs

- [Changing the `selected` type ripples into screens and tests] → The compiler finds every use.
  Update the `dragIntegration` mock and the parity suite in the same task.
- [A player expecting today's "tap full flask → select it instead" is surprised] → That only
  happens when the tapped full flask matches the selection's colour, where the old behaviour
  was a no-op re-pick. Every other case is unchanged.
- [Replaying a long group in the server replay] → It is just N ordinary moves. There is no new
  code path on the server.
