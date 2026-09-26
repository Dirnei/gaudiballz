# Proposal

## Why

One missed day wipes out a day streak completely, so a player 40 days in loses everything to a
busy Tuesday. That feels unfair, and it pushes people to play out of obligation instead of for
fun. Streak freezes let consistent players absorb the odd missed day. They are earned by
playing and are never sold.

## What Changes

- Players earn a **streak freeze** for every 7 real played days in their current streak (on
  streak days 7, 14, 21, …). They can hold at most **2**. A freeze earned while holding 2 is
  lost.
- Missed days are **covered automatically** by held freezes, one freeze per missed day. If the
  gap is longer than the freezes held, the streak resets as it does today and **no freezes are
  spent**.
- A frozen day **keeps** the streak alive but does not add to it. It does not count toward
  earning the next freeze, the full-week achievement, or the streak-day XP bonus.
- Streak achievements (2, 7, 14 and 30 days) use the streak including frozen days.
- The home page shows a quiet notice when freezes are covering missed days. The number of
  freezes held appears next to the streak on the progress tile and in the stats view.
- Anonymous and registered players both get freezes. No account is needed.
- The streak becomes stored player state (it has to remember frozen days) instead of being
  derived only from completion days.

Out of scope: an in-game currency and a shop where freezes could also be bought into the same
pool. That is a separate, later change.

## Capabilities

### New Capabilities

- `streak-freeze`: earning, holding, capping and automatically spending streak freezes, and
  how the player is told about them.

### Modified Capabilities

- `player-achievements`: "Streak achievements track consecutive calendar days". Days covered
  by a freeze no longer break the streak.
- `main-menu`: "Home page displays player progress tiles". The streak tile shows the freezes
  held.
- `player-stats-view`: "Player stats view shows aggregated personal statistics". It shows the
  freezes held next to the current streak.

## Impact

- Server: the streak calculation is duplicated today in `Hub/HubSlice.cs` and
  `Achievements/AchievementCatalogue.cs` and will be unified. New persisted freeze state per
  player, updated on each verified completion (campaign and daily).
- API: hub/progress responses gain the freeze count and a "covered by freeze" signal.
- Client: `ProgressTiles`, `StatsPage` and a home-page notice, plus i18n strings.
- No rules-engine or conformance changes.
