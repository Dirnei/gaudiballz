## Why

The points-wallet change introduced a per-player XP ledger but left the progress-derived
total as the actual authority. The wallet records credits and adjustments but nothing reads
from it — the progress API and leaderboard still use `PlayerProgress.TotalPoints`. Until
the wallet is authoritative, its ledger is a shadow copy with no practical benefit.

## What Changes

- The progress GET endpoint reads the wallet balance via `GetBalance` and uses it as the
  `totalPoints` field in the response, with a graceful fallback to the progress-derived
  total when the wallet actor is unavailable.
- The leaderboard all-time upsert in the completion fire-and-forget block reads the wallet
  balance and uses it instead of `updatedProgress.TotalPoints + bonus.Total`.
- Rank computation in both the progress response and the hub player-stats endpoint uses the
  wallet balance.
- No player-facing values change — the wallet balance equals the progress-derived total
  after migration, so this is a transparent authority switch.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `points-wallet`: The "Wallet balance is the authoritative XP total" requirement is
  already specified but not yet implemented — the progress API and leaderboard still derive
  XP from progress data. This change fulfils that requirement.

## Impact

- **Server**: `ProgressionSlice` progress GET endpoint and completion fire-and-forget block
  change from reading `PlayerProgress.TotalPoints` to asking the wallet for `GetBalance`.
  `HubSlice` player-stats endpoint does the same. All three paths fall back to the
  progress-derived total on wallet timeout.
- **Client**: No changes.
- **Dependencies**: None — the wallet actor already exists.
