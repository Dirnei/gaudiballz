## Why

Today, XP is computed on the fly as `Sum(Points + BonusPoints)` across all levels in
`PlayerProgress`. Points are baked into `ProgressDocument` at completion time — if
`Scoring.Calculate()` has a bug, or the point values for star ratings are rebalanced,
historical XP cannot be corrected without a lossy manual migration. Bonuses are `$inc`'d
onto a counter with no record of which bonuses were awarded or why. There is no way to
audit, correct, or replay point history.

The per-level-leaderboard change introduces Akka.Persistence and event-sources raw
completion facts. The wallet extends that foundation to point accounting: each XP credit
becomes a discrete journaled event, the wallet balance is the authoritative XP total, and
scoring corrections are issue-and-adjust operations against an immutable ledger.

## What Changes

- Each XP earning (base score, first-clear bonus, no-hint bonus, streak bonus, replay
  bonus, time-beat bonus) is recorded as a separate credit event in a per-player wallet
  journal, with source, category, amount, and the level it came from.
- The wallet's running balance replaces `PlayerProgress.TotalPoints` as the authoritative
  XP source for rank computation, leaderboard ranking, and the progress API.
- When a player improves their star rating on a level, the wallet receives an adjustment
  that revokes the old base-score credit and issues the new one — the net delta matches
  what the player sees today.
- The completion response, progress response, leaderboard entries, and rank computation
  all read from the wallet balance. No player-facing values or formats change.
- `ProgressDocument` continues to track best results per level (moves, hints, stars). It
  remains the source of truth for progression gating and level-select display. It no
  longer owns the authoritative XP total.
- A one-time migration seeds the wallet with credits derived from existing
  `ProgressDocument` data, so existing players see the same XP total after the change.

## Capabilities

### New Capabilities

- `points-wallet`: Per-player XP ledger that records each point earning as a discrete
  event, maintains an authoritative balance, and supports corrections via adjustment
  entries.

### Modified Capabilities

_(none — the player-facing behaviour of level-scoring, global-leaderboard, and
player-ranks is unchanged; the wallet is a new internal authority that feeds the same
observable values)_

## Impact

- **Server**: New persistent actor (`PlayerWallet`) with Akka.Persistence journal.
  `ProgressionSlice` completion flow changes from inline point calculation to sending
  credit commands to the wallet. `PuzzleStore.UpsertLeaderboardAsync` reads from the
  wallet balance instead of `PlayerProgress.TotalPoints`. `RankTier.FromXp` input changes
  from the progress-derived sum to the wallet balance.
- **Client**: No changes — the completion response and progress response keep the same
  shape; the wallet is transparent to the frontend.
- **Dependencies**: Uses Akka.Persistence.MongoDb already introduced by the
  per-level-leaderboard change. No additional packages.
- **Migration**: One-time backfill creates credit events from existing progress data.
