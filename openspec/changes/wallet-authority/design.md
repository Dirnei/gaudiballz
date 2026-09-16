## Context

The `PlayerWallet` persistent actor, `WalletRegistry`, and the migration backfill already
exist. Wallet credits are sent fire-and-forget on every completion. The progress API and
leaderboard still read from `PlayerProgress.TotalPoints` — the wallet is a shadow ledger.

## Goals / Non-Goals

**Goals:**

- The progress GET endpoint uses the wallet balance as `totalPoints`
- The leaderboard all-time upsert uses the wallet balance
- The hub player-stats endpoint uses the wallet balance for rank and XP
- All three paths fall back to the progress-derived total on wallet timeout
- No player-facing change in values

**Non-Goals:**

- No change to how credits are sent (already fire-and-forget)
- No change to the completion response (it uses inline-computed values, not the wallet)
- No change to period leaderboard entries (they use `$inc`, not a total)

## Decisions

### 1. Ask with fallback pattern

Each read path wraps the wallet `Ask<BalanceResult>` in a try/catch with a 2-second
timeout. On timeout or failure, the code falls back to `snapshot.Progress.TotalPoints`
(or `+ bonus.Total` in the completion flow). This makes the wallet authoritative when
healthy and the system resilient when it's not.

### 2. Leaderboard upsert in the fire-and-forget block

The completion fire-and-forget block already runs in a `Task.Run`. The wallet Ask adds
at most 2 seconds of latency to this background task, which is acceptable since it
never blocks the completion response.

### 3. Hub player-stats endpoint

The `/api/hub/player/stats` endpoint currently computes rank from
`progress.TotalPoints`. It switches to the wallet balance with the same fallback
pattern.

## Risks / Trade-offs

- **Wallet timeout adds latency to fire-and-forget**: The leaderboard upsert waits up
  to 2 seconds for the wallet. If the wallet is consistently down, every completion's
  background work takes 2 seconds longer. The fallback ensures correctness.
- **Divergence during wallet outage**: If the wallet is down, the leaderboard uses the
  progress-derived total. When the wallet recovers, the next completion corrects it.
  Brief divergence is acceptable — the values are identical during normal operation.
