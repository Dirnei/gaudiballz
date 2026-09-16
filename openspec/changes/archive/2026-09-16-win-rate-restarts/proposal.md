## Why

Win rate reads 0% on the "Today" and "This Week" leaderboards: period entries increment a
games-played counter but never a games-won counter, so the client divides by a number that
is always zero.

Fixing only that would swap one useless number for another. A win currently means "cleared
with at least one star", and the scoring floor is one star for any completion the server
accepts. A player cannot submit a loss, because the server only ever hears about
completions — an abandoned board is simply never sent. Under that definition every row
would read 100%.

The missing half is the losing. A sort puzzle has no lose condition built into the rules,
but it has two in practice: wiping the board and starting over, and walking away. Neither
reaches the server today. Once they do, win rate measures something real — how often a
player sees a level through.

## What Changes

- An **attempt** becomes a thing the server knows about, with an outcome. It ends in one of
  three ways: completed (a win), restarted (a loss), or abandoned (a loss).
- Leaving a level mid-attempt counts as abandoning it. Navigating away inside the app
  raises a confirmation modal first, so the cost is stated before it is paid rather than
  discovered afterwards.
- Closing or reloading the tab also ends the attempt as a loss, reported on a best-effort
  basis. The browser's own prompt is the only warning available there.
- Win rate is redefined as completions divided by attempts, on the all-time leaderboard,
  the period leaderboards, and the hub player-stats endpoint.
- **No migration.** Counting starts when this ships. Levels cleared before then have no
  attempt history and are not invented one, so early figures describe recent play only.

## Capabilities

### New Capabilities

- `attempt-outcomes`: What starts and ends an attempt at a level, what each ending counts
  as, and the warning a player gets before an in-app navigation throws one away.

### Modified Capabilities

- `global-leaderboard`: The entry-contents requirement names "win rate" without defining
  it, and the period-filtering requirement does not say that games played and win rate are
  scoped to the period. Both need stating.
- `player-stats-view`: The aggregated-statistics requirement defines win rate only by
  example ("played 167, won 110"). It needs to say what counts as a win and that the counts
  are attempts rather than distinct levels.

## Impact

- **Client**: A confirmation modal on in-app navigation away from an unfinished attempt,
  wired through React Router's navigation blocking. A `beforeunload` handler plus
  `navigator.sendBeacon` for tab close and reload. Reporting an abandoned attempt, and
  reporting a restart as the end of one.
- **Server**: A way to record an attempt ending without a completion. Attempt and win
  counts per player, fed to the all-time leaderboard upsert, the period leaderboard upsert,
  and the hub player-stats endpoint.
- **Persistence**: The completion journal already records raw per-attempt facts and gains
  the endings it does not yet see. No existing document changes shape and nothing is
  backfilled.
- **Risk**: A beacon sent as the tab closes is not guaranteed to arrive, so tab-close losses
  will undercount. In-app navigation, which is the common case, is reliable.
