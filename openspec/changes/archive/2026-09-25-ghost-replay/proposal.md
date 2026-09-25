# Proposal

## Why

A shared result page shows the numbers, but not *how* the puzzle was solved. Watching a friend's
solution play out move by move is the most persuasive thing the page could show, and it makes the
Play button right below it more tempting.

Replay needs the moves, and the server doesn't receive them today. Completions send only a move
count, so "client plays, server verifies" isn't actually true: anyone can submit
`moves: 1` for any level. Sending the move list and replaying it on the server closes that gap
and gives the replay its data in the same step.

## What Changes

- Campaign and daily completions send the ordered list of moves that solved the board (after
  undo), plus the rule set version they were played under. Completions waiting in the offline
  queue carry it too.
- The server replays the list on the level's own starting board with the server rules engine.
  It rejects a completion whose moves include an illegal one, whose moves don't end in a solved
  board, or whose claimed move count is lower than the moves it takes to get there. A rejected
  completion is not recorded, and the client drops it instead of retrying.
- A completion queued by an older build, without a move list, is still accepted, so no offline
  progress is lost. It is recorded as unverified and gets no replay.
- The shared result stores the verified move list. The result page gets a **Watch replay**
  control that plays the attempt on the board preview move by move, with play/pause, restart
  and a move counter. With reduced motion turned on, it steps without animation and doesn't
  auto-advance.

## Capabilities

### New Capabilities

- `completion-verification`: what a completion must carry and how the server checks it before
  it counts.

### Modified Capabilities

- `shared-result-page`: adds the replay of a shared attempt, and what the page shows when no
  replay is available.

## Impact

- Server: `ProgressionSlice` and `DailySlice` completion endpoints take `moveList` and
  `rulesVersion`, and replay them before scoring. `SharedResultDocument` gains the move list and
  a verified flag. `GET /api/v1/shares/{id}` returns them. The daily's starting board is cached
  per date, because generating it runs 14 candidate boards.
- Client: `useGame`, `useDailyGame`, `progress.ts` and `completionQueue.ts` send the move list.
  `SharedResultPage` and `BoardPreview` get a replay player.
- Rules engine and conformance fixtures: unchanged. Replay is built from the existing,
  fixture-covered move application and win check.
- Tests: new server integration tests for accept/reject paths; client tests for the replay
  player and the queued payload.
