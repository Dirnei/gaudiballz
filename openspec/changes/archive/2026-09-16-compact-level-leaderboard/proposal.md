## Why

The level leaderboard shown after solving a level sits inside a dialog, and it carries the
same seven columns as the full-width version on the level-select screen: rank, ball, name,
rank badge, stars, moves, time. In that width the badge alone is wider than the move count,
names truncate to a few characters, and the numbers a player actually came to compare are
squeezed to the right edge.

The place a player looks hardest at a level leaderboard is the moment they finish the level,
which is exactly where it reads worst.

## What Changes

- The leaderboard shown on completion drops the profile ball and the rank tier badge.
- Its star rating collapses from three glyphs to a single count, keeping the information at a
  fraction of the width.
- Rank, name, stars, moves and time remain, so what is left is position and result.
- The level-select screen keeps the fuller presentation, where the width is available.
- No ranking, data or API change. The same entries arrive in the same order; only the
  completion view shows fewer of their fields.

## Capabilities

### Modified Capabilities

- `level-leaderboard`: The entry-contents requirement mandates ball, badge and star rating on
  every entry, with no allowance for a narrower presentation. It needs to distinguish what a
  full-width leaderboard shows from what the completion dialog shows.

## Impact

- **Client**: `LevelLeaderboard` gains a compact presentation, used by the completion dialog
  in `GameScreen`. The two level-select usages are untouched.
- **Server**: No change. The compact view uses fields the response already carries.
- **Risk**: Stars remain the primary ranking key, so they stay visible in compact form. A
  leaderboard that hid them would show rows whose order contradicts every number on screen.
