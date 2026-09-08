## Why

The game tracks moves and hints but gives no feedback beyond "under par." A star rating per level gives players a clear goal to chase on replay, and a point total derived from stars becomes a spendable currency in future features. Right now there is no reason to replay a completed level — stars change that.

## What Changes

- Each level completion earns 1–3 stars based on moves relative to par and elapsed time.
- Using any hint during the attempt caps the result at 1 star regardless of moves or time.
- A per-level time target is derived from the level's par and difficulty so that 3 stars requires both efficient moves and reasonable speed.
- Each star earned maps to a point value; total points accumulate across all levels (best per level).
- The client tracks elapsed time per attempt and submits it with the completion payload.
- The win screen shows the star rating and point award.
- Level-select tiles show the best star count for completed levels.
- The server records and serves per-level star/point results alongside existing move/hint data.

## Capabilities

### New Capabilities
- `level-scoring`: Star rating (1–3) per level based on moves and time, hint penalty, point values, display on win screen and level select, best-result persistence.

### Modified Capabilities
- `level-progression`: Completion payload carries elapsed time; best-result model includes stars and points alongside moves and hints.
- `level-select`: Completed tiles show best star rating instead of raw move count.

## Impact

- **Server**: Completion endpoint accepts elapsed time, computes stars/points, persists alongside existing `LevelResult`. New fields in progress API responses.
- **Client**: Timer per attempt, elapsed time in completion payload, star display on win screen and level-select tiles.
- **Database**: `player_progress` documents gain `stars`, `points`, and `time` fields per level entry.
- **API**: Completion request/response and progress response schemas grow; existing fields unchanged (non-breaking).
