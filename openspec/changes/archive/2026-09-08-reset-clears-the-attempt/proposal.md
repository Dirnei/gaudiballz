## Why

Two undos is too tight in practice. The budget was set before the later levels existed, and
on a board with eleven colours a single misread costs the whole attempt — which is a restart,
which is the whole level. The limit stops being a reason to think and starts being a reason
to stop playing.

The counters are also wrong about what they measure. A restart begins a new attempt, but the
tallies carry across it, so the win screen reports help taken in attempts the player already
threw away and paid for. And counting undos and resets on the win screen adds nothing:
undos are budgeted, so the game already limits them, and resets are unlimited by design.
Hints are the one thing a player takes freely and might care to see.

## What Changes

- **Undo budget rises from 2 to 5** per attempt.
- **A restart clears the hint count**, along with the board and the undo budget.
- **Undos used and resets used are no longer tracked or shown.** The hint count is the only
  count the game keeps.

## Capabilities

### Modified Capabilities

- `attempt-limits`: the undo budget is 5 rather than 2, a reset clears the attempt's hint
  count, and the win screen reports hints only.

## Impact

- **Client** (`client/src/game/attempt.ts`): `UNDOS_PER_ATTEMPT` becomes 5; the used-counters
  are dropped, leaving the remaining undo budget; a restart returns a fresh attempt.
- **Client hook** (`client/src/game/useGame.ts`): `restart` clears `hintsUsed`; `undosUsed`
  and `resetsUsed` are no longer exposed.
- **Client UI** (`client/src/game/App.tsx`): the win overlay drops the undo and reset counts.
- **No server changes**: the completion submitted on a solve already carries the hint count
  for the attempt that solved the level, which is what clearing on restart makes true.
