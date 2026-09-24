# Proposal

## Why

"Games played" on the home page (the four-week chart and the this week / this month / all
time counts) and in the personal activity on the stats page only counts **completed** levels.
A restarted game, a game the player walked away from, and any unfinished daily challenge never
appear. The number reads as "games played", but it actually measures "games won". The stats
page even disagrees with itself: its games-played card already counts every attempt, while
the activity chart beside it counts only clears.

## What Changes

- A game counts as played the moment it **starts**, with the player's first move. This is the
  same point at which `attempt-outcomes` begins an attempt. Opening a board and leaving
  without moving still counts nothing.
- Every started game counts once, however it ends: completed, restarted or abandoned. A
  restart begins a new game, so restarting twice and then clearing counts three games.
- This applies to the campaign **and the daily challenge**. The daily challenge never reported
  unfinished games before; now each daily game is counted when it starts.
- The home page chart and totals (all players) and the stats page activity (one player)
  switch from counting completions to counting started games.
- Days before this change keep showing what was recorded then, which is completions. No
  history is reconstructed.
- **Unchanged:** "puzzles solved today", "active players this week", day streaks, the
  full-week achievement and the first-clear-of-the-day streak bonus stay based on completions.
  Starting a game without finishing it does not keep a streak alive.
- **Unchanged:** win rate and the stats page's games-played card, which count campaign
  attempts by outcome as `attempt-outcomes` defines.

## Capabilities

### New Capabilities
- `games-played-activity`: how many games were played per day, week, month and all time, for
  all players (home page) and for one player (stats page). A game counts when it starts.

### Modified Capabilities
<!-- None. community-stats already defines solved-today and active-this-week as completion
     based, and this change keeps them so; attempt-outcomes is unchanged. -->

## Impact

- **Server:**
  - a new endpoint for reporting that a game started, for campaign and daily
  - a per-player, per-day count of started games, stored apart from the completion record
    that streaks read
  - the home-page and stats-page activity queries read started games, falling back to
    completions for days before the change
- **Client:**
  - the campaign reports a start when an attempt begins
  - the daily challenge gains the same "attempt begins at first move" tracking, and reports
    a start for each game, including after a restart
- **Tests:** server store/endpoint tests with Testcontainers Mongo; client hook tests for when a
  start is reported.
- **Known difference, out of scope:** the stats page's games-played *card* counts campaign
  attempts only, while the activity counts include daily games.
- No rules engine, conformance or scoring change.
