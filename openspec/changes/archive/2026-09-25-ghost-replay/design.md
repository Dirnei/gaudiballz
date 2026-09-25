# Design

## Context

- The client already keeps the net move list: `GameState.moves` in `client/src/engine/history.ts`
  holds the moves that survived undo, and its doc comment says "This is what gets submitted".
  Hint moves go through `play()` (`useBoardPlay.useHint`), so they are in the list. A
  multi-pour goes through `playGroup()` as one move per flask.
- The move *count* the player is scored on (`useBoardPlay` `totalMoves`) is different: it keeps
  undone moves (commit 96dfa27, "Keep move count stable across undo"). So the list can be
  shorter than the count, never longer.
- Nothing sends the list today. `POST /api/v1/progress/completions` (`ProgressionSlice`,
  `CompletionRequest`) and `POST /api/v1/daily/completions` (`DailySlice`,
  `DailyCompletionRequest`) take counts only. The offline queue item (`PendingCompletion` in
  `completionQueue.ts`) has no list either. `drain()` in `progress.ts` already forgets an item
  on HTTP 400.
- The C# engine has everything a replay needs: `IRuleSet.TryApply`, `IRuleSet.IsSolved`, and
  `RuleSets.Get(version)`, which throws for an unknown version. Both engines' move application
  is covered by the conformance fixtures, including the bidirectional `replay-inputs.json` /
  `ts-replay.json` pair. Moves are `{ from, to }` tube indices (`Move(byte From, byte To)` in
  C#).
- Boards: `LevelCatalogue.Build(levelId)` is cached. `DailyChallenge.BoardForDate(date)` is not,
  and generates 14 candidate boards per call.

## Goals / Non-Goals

**Goals:**
- A completion counts only if its moves replay to a solved board on the server.
- The shared result keeps the verified list, and the result page plays it back.
- No offline progress queued by an older build is lost.

**Non-Goals:**
- Recording or replaying undone moves, or the timing between moves. The replay shows the line
  that solved the board at a fixed pace, not the player's real rhythm.
- Checking the elapsed time or hint count against the moves. Time can't be verified from a move
  list, and a hint is indistinguishable from a move the player chose.
- Replay inside the game itself (on the win screen), or for leaderboard entries. Both are easy
  follow-ups once the list is stored.

## Decisions

**Wire format: `moveList: [[from, to], ...]` plus `rulesVersion`.** Pairs keep a 300-move list
around 3 KB of JSON. `rulesVersion` comes from the client's `RULES_VERSION`. When it's missing
but a list is present, the server assumes 1. An unknown version is a 400 (`unknown-rules-version`),
as the `sort-puzzle-rules` versioning requirement already asks.

**Replay is a pure function in `GaudiBallz.Rules`**, e.g.
`Replay.Verify(IRuleSet rules, Board start, IReadOnlyList<Move> moves) → ReplayOutcome`
(`Solved`, `IllegalMove(index, rejection)`, `NotSolved`). It uses only `TryApply` and
`IsSolved`, so it adds no rule behaviour and needs no new conformance fixture. A unit test
replays each `replay-inputs.json` entry through it to tie it to the shared fixtures.
- *Alternative*: verify in the endpoint. Rejected: the Rules project is the one with no I/O and
  the dependency-boundary tests, and verification is domain logic.

**Checks, in order:** list length ≤ 2000 (`too-many-moves`), then claimed count ≥ list length
(`move-count-too-low`), then replay (`illegal-move` with the index, or `not-solved`). Every
failure is a 400 with `{ error, code }`, returned before anything is written, in both endpoints.
Doing it first matters in `ProgressionSlice`, which otherwise writes progress, bonuses,
achievements, the journal, the wallet and hub projections.

**No actor.** Verification is a synchronous, CPU-bound replay of at most 2000 moves on a board
of a few dozen cells, well under a millisecond. It has no state, no identity and no ordering to
protect, so it runs inline in the request. Routing it through an actor would add a hop and a
mailbox for nothing. The existing actors (`PlayerRegion`, wallet, journal) are unchanged and only
receive completions that already passed.

**Determinism.** Verification only works if the server regenerates exactly the board the client
played. Both come from the seeded `Pcg32` generator: the campaign via `LevelCatalogue.Build`, the
daily via `DailyChallenge.BoardForDate(date)`. For the daily, the date is the server's UTC day
when the request arrives, as scoring already assumes. A completion queued offline across UTC
midnight will be replayed on the wrong day's board and rejected. See Risks. The daily board is
cached per date in a small `ConcurrentDictionary<DateOnly, Level>` (at most a couple of entries
live), because verification now needs it on every daily completion.

**Legacy completions without `moveList` are accepted and marked unverified.** Old builds'
queued items can't be re-created with moves, and the `level-progression` spec promises offline
progress isn't lost. The server scores them exactly as today and stores the shared result with
`Verified = false` and no moves. New clients always send the list, so this path shrinks to
nothing as old queues drain. It is a deliberate, temporary hole: once a release has been out long
enough, a follow-up change can reject move-less completions.

**Stored result.** `SharedResultDocument` gains `MoveList` (`int[][]`, omitted when null) and
`Verified` (bool). `GET /api/v1/shares/{id}` returns `moveList` (or `null`). The names are
`MoveList`/`moveList` rather than `moves` because `moves` is already the scored move count on
both the document and the response. The replay is shown only when `moveList` is non-null.

**Where the check lives.** `Replay.Verify` is the pure replay in `GaudiBallz.Rules`. The request
checks around it (length cap, count, rules version, pair shape) and the 400 shape live in
`GaudiBallz.Server/Verification/CompletionVerifier`, called by both completion endpoints right
after the level's board is built. Rejections are logged with their code.

**Client submission.** `useGame` and `useDailyGame` pass `state.moves` as `moveList` together
with `RULES_VERSION`. `PendingCompletion` gains optional `moveList` and `rulesVersion`. They stay
optional in the type because items already in IndexedDB don't have them. The IndexedDB schema
is unchanged: object stores are schemaless per record.

**Replay player (client).** A `useReplay(board, moves)` hook applies moves with the existing TS
`applyMove`, which is already fixture-proven equal to the server's. It exposes `step`, `index`,
`playing`, `play/pause/restart/next/prev` and ticks every 600 ms while playing. `BoardPreview`
takes an optional `highlight: { from, to }` to ring the source and destination tubes, and
animates ball entry and exit with the same Motion springs as `Tube`, unless reduced motion is set.
Reduced motion is read with `matchMedia('(prefers-reduced-motion: reduce)')`: no auto-advance
(play is replaced by next/previous), and no enter/exit animation. "Move n of total" is shown as
text, and "3 moves were undone" appears when `result.moves > list length`.

## Risks / Trade-offs

- [A generator change alters old levels' boards, so queued completions fail replay] →
  `LevelCatalogue` is versioned and the generator must stay deterministic. A generator change is
  already a breaking event for par, codes and leaderboards. If it ever happens, send
  `generatorVersion` with the completion and keep old generators, as rule sets are kept.
- [A daily completion queued offline and sent after UTC midnight replays on the wrong board and
  is rejected] → already broken today in a different way (it is scored against the new day's
  par). Accepted. A later change can send the daily's date and accept yesterday's.
- [Move-less legacy completions stay forgeable] → temporary by design. Everything new is
  verified, and a follow-up can close the path.
- [A client bug that drops or adds a move now loses the player's completion] → the list is
  `GameState.moves`, which is exactly what the engine played. A client test solves a level
  with undo, hint and multi-pour and replays the submitted list through the TS engine to prove it
  ends solved. The server rejection is logged with its code so any regression shows up fast.
- [Payload growth] → capped at 2000 moves (~20 KB worst case). Typical levels are 15-60 moves.
