# Tasks — add puzzle solver

## 1. Canonical positions

- [x] 1.1 Write tests that two boards differing only in tube order produce the same key,
      and that boards differing in contents produce different keys
- [x] 1.2 Implement the canonical key by sorting tube contents

## 2. Search

- [x] 2.1 Write tests for the three verdicts: a solvable position is winnable, an already
      solved board is winnable, a board with no legal moves is dead
- [x] 2.2 Write the test that matters most: a position that runs out of budget reports
      unknown and never dead
- [x] 2.3 Implement the iterative depth-first search with an explicit stack, a visited set
      keyed canonically, and both budgets
- [x] 2.4 Add move ordering — completing a colour, then matching pours, then empty tubes
      last — and skip the immediate inverse and whole-uniform-tube-onto-empty moves
- [x] 2.5 Property: every generated level is winnable from its starting position, which
      cross-checks the solver against the generator's constructive guarantee

## 3. Hint

- [x] 3.1 Write the test that a hinted move leaves the position winnable
- [x] 3.2 Write the test that following hints repeatedly reaches a solved board
- [x] 3.3 Write the test that a dead position offers no hint
- [x] 3.4 Implement hint selection from the search's first move

## 4. Budget calibration

- [x] 4.1 Measure search cost across the campaign, especially the late one-spare levels,
      and record the numbers — every board from level 1 to 200 decided in under 200
      positions and about a millisecond, opening and mid-game alike
- [x] 4.2 Set the node and time budgets from that measurement rather than by guessing —
      60,000 nodes and 45ms for the after-move check, two orders of magnitude above what
      real boards need, so a pathological position still gets an answer
- [x] 4.3 Confirm the check is fast enough to run after every move on the largest board

## 5. Game wiring

- [x] 5.1 Evaluate the position after each move and expose the verdict to the interface
- [x] 5.2 Add the hint control, free and unlimited, that plays the suggested move
- [x] 5.3 Show the dead-position notice with undo and restart offered, and confirm play is
      not blocked and the level does not restart itself
- [x] 5.4 Confirm an unknown verdict never renders as lost
- [x] 5.5 Count hints used per attempt and surface it on the win screen

## 6. Verification

- [x] 6.1 Run every CI step locally and confirm green
- [x] 6.2 Play a level into a dead position and confirm the notice appears at the right
      move, not a move late — asserted in `deadDetection.test.ts` by checking the board
      before the losing move was still winnable
- [x] 6.3 Rebuild the container and confirm hints work there too
