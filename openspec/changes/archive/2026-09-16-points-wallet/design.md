## Context

See proposal.md — Why. The project already uses Akka.NET actors to serialize per-player
writes (`PlayerSessionActor`, `AchievementEvaluatorActor`). The per-level-leaderboard
change introduces Akka.Persistence.MongoDb for event journaling and Akka.Streams for
projections. The wallet builds directly on that infrastructure.

Today, XP accumulation is spread across three mechanisms:
- `Scoring.Calculate()` returns (Stars, Points) at completion time → stored in
  `ProgressDocument.BestPoints` via `$max`
- `RecordCompletionBonusAsync()` computes bonuses and `$inc`s them onto
  `ProgressDocument.BonusPoints`
- `PlayerProgress.TotalPoints` = `Sum(r.Points + r.BonusPoints)` across all levels

The global leaderboard upserts this derived total. Rank tiers are computed from it.
Nothing records what was earned when or why.

## Goals / Non-Goals

**Goals:**

- Each XP earning is a discrete journaled event in a per-player wallet
- The wallet balance is the authoritative XP total for leaderboards and ranks
- Star-rating improvements produce an adjustment (revoke old, credit new) so the balance
  is always correct
- Existing players are migrated so their XP is unchanged
- The completion response latency is not increased — credits are fire-and-forget

**Non-Goals:**

- No spending, currency, or economy — this is an accounting ledger
- No admin UI for triggering recalculations (the mechanism exists, tooling is a future
  concern)
- No change to the per-level leaderboard (it derives scores independently from the
  completion journal)
- No change to how `Scoring.Calculate()` works or what bonus types exist
- No player-facing "transaction history" UI

## Decisions

### 1. Persistent actor per player: `PlayerWallet`

**Choice**: A `ReceivePersistentActor` with persistence id `wallet-{playerId}`. One
actor per player, managed by a `WalletRegistry` that routes by `PlayerId` and
passivates idle actors (same pattern as `PlayerRegistryActor`).

**Why an actor earns its place**: The wallet has long-lived state (the balance and the
per-level credit map), ordering matters (credits and adjustments must not interleave
incorrectly), and Akka.Persistence requires an actor host. The registry/passivation
pattern is already proven in the codebase for `PlayerRegistryActor` and
`AchievementRegistryActor`.

**Alternative considered**: A stateless service writing directly to a MongoDB collection.
Rejected — it would re-create the "compute-and-store" pattern the wallet exists to
replace. The actor's journal IS the ledger; a separate collection would be a second
source of truth.

### 2. Event types

**Choice**: Two event types in the wallet journal:

`PointsCredited`:
- `Category` (enum: BaseScore, FirstClearBonus, NoHintBonus, StreakBonus, ReplayBonus,
  TimeBeatBonus, Migration)
- `Level` (int, nullable — migration credits may span multiple levels)
- `Amount` (int, always positive)
- `Timestamp` (UTC)

`PointsAdjusted`:
- `Category` (same enum — identifies what is being corrected)
- `Level` (int)
- `OldAmount` (int)
- `NewAmount` (int)
- `Timestamp` (UTC)
- Net effect on balance: `NewAmount - OldAmount` (can be positive or negative)

**Why two types instead of a single signed-amount event**: Adjustments carry the old and
new amounts explicitly, which makes the ledger self-describing. An audit reader can see
"level 5 base score changed from 250 to 500" without needing to correlate two entries.
Credits are always positive and never reference a prior value.

### 3. Actor state

**Choice**: The wallet actor maintains two pieces of state, rebuilt on recovery by
replaying journal events:

- `Balance` (int): running XP total
- `LevelBaseCredits` (Dictionary<int, int>): level → last credited base-score amount

`LevelBaseCredits` is needed so the actor knows the old amount when a star-rating
improvement triggers an adjustment. Without it, the actor would need to scan the journal
on every completion to find the previous credit.

**Snapshots**: After every N events (e.g. 100), the actor saves a snapshot of
`(Balance, LevelBaseCredits)`. Recovery loads the latest snapshot and replays only
subsequent events. This bounds recovery time as the journal grows.

### 4. Command messages

`CreditPoints(PlayerId, Level, Category, Amount)`:
- The wallet persists a `PointsCredited` event and updates `Balance`.
- For `BaseScore` credits: checks `LevelBaseCredits[level]`. If a previous credit exists
  and the new amount is higher, persists a `PointsAdjusted` event (revoking the old)
  followed by the `PointsCredited` event. If the new amount is not higher, the command is
  a no-op (the existing credit stands).
- For bonus credits: always persists (bonuses are additive, never replaced).
- Reply: `CreditResult(NewBalance)`.

`GetBalance(PlayerId)`:
- Returns `BalanceResult(Balance)` from the actor's current state. No persistence.

### 5. Integration with the completion flow

**Choice**: The completion handler in `ProgressionSlice` sends credits to the wallet in
the existing fire-and-forget block (alongside leaderboard and activity-feed writes). The
completion response continues to use `progress.TotalPoints + bonus.Total` for the
`totalPoints` field — this is accurate for the current completion because the progress
map and bonus are still computed inline.

The leaderboard upsert switches from `progress.TotalPoints + bonus.Total` to asking the
wallet for its balance via `GetBalance`. This is the point where the wallet becomes
authoritative.

**Why fire-and-forget for credits**: The wallet journal is the long-term source of truth,
but it does not need to block the completion response. If the journal write fails, the
actor's supervisor restarts it; credits sent during the outage are lost but the player's
progress (in `ProgressDocument`) is unaffected and the wallet can be rebuilt from progress
data via migration.

**Flow after this change:**
1. `Scoring.Calculate()` → (stars, points) — unchanged
2. `RecordCompletion` via `PlayerSessionActor` → `ProgressDocument` updated — unchanged
3. `RecordCompletionBonusAsync()` → bonus computed — unchanged
4. Fire-and-forget block:
   a. `Tell` wallet: `CreditPoints(BaseScore, level, points)` (handles adjustment
      internally if stars improved)
   b. `Tell` wallet: `CreditPoints(FirstClearBonus, ...)`, `CreditPoints(NoHintBonus, ...)`
      etc. for each applicable bonus
   c. `Ask` wallet: `GetBalance` → use result for leaderboard upsert
   d. Leaderboard + activity feed writes — as before, but using wallet balance

### 6. How the global leaderboard transitions

**Choice**: The leaderboard upsert in the fire-and-forget block switches from
`updatedProgress.TotalPoints + bonus.Total` to the wallet balance returned by
`GetBalance`. The leaderboard period upsert (`UpsertPeriodLeaderboardAsync`) uses the
delta computed from `starDelta + bonus.Total` — this is unchanged because the per-period
entries use `$inc` (additive), not a total-replacement.

The all-time leaderboard entry's `TotalPoints` field becomes the wallet balance. For
period entries, the incremented amount stays the same.

### 7. Migration: seeding wallets from progress

**Choice**: A one-time migration job (run in `IndexInitializer`, same as the leaderboard
backfill) iterates all `ProgressDocument`s and all `DailyPlayDocument`s (for bonus
reconstruction). For each player:

1. Group progress documents by player
2. For each level with a best result: credit `BaseScore` with the star-rating's point
   value
3. For each level with `BonusPoints > 0`: credit a `Migration` entry carrying the
   aggregate bonus amount (individual bonus breakdown is not available from historical
   data)
4. Sum must equal the player's current `TotalPoints`

The `Migration` category distinguishes seeded credits from organically earned ones. The
migration is idempotent: if the wallet already has a non-zero balance for a player, skip
them.

**Why lossy bonus breakdown is acceptable**: Historical `ProgressDocument` stores
`BonusPoints` as an accumulated integer, not broken down by type. The migration cannot
reconstruct which bonuses were earned. This is an accepted trade-off — forward from this
point, every bonus is individually tracked. The total is correct; only the per-type
breakdown is lost for pre-existing data.

### 8. Recalculation procedure (not automated, but enabled)

The wallet + completion journal together enable score correction:

1. Read the completion journal (from the per-level-leaderboard change) for all events
2. For each event, compute the score using the updated `Scoring.Calculate()`
3. Compare with the wallet's `LevelBaseCredits` for that level
4. If different, send an adjustment command to the wallet
5. The leaderboard projection picks up the changed balance on its next update

This is a manual/scripted process. The design enables it; tooling is a future concern.

## Risks / Trade-offs

- **Fire-and-forget credit loss**: If the wallet actor is down when credits are sent,
  those credits are lost from the journal. Mitigation: the wallet can be rebuilt from
  `ProgressDocument` data (which is still updated synchronously). The journal is additive
  to, not a replacement for, progress persistence.
- **Migration is lossy for bonus breakdown**: Pre-existing bonus XP is a single number
  per level, not broken into categories. The total is correct; the per-type audit trail
  begins from the point this change ships.
- **Two sources of XP during transition**: Until the leaderboard upsert switches to the
  wallet balance, `PlayerProgress.TotalPoints` and the wallet balance should agree. The
  migration ensures initial agreement; ongoing credits keep them in sync. A consistency
  check (log a warning if they diverge) provides a safety net during the transition.
- **Journal growth**: Every bonus is a separate event. A 3-star no-hint first-clear
  completion produces 3 events (base score, first-clear, no-hint). At current play volume
  this is negligible. Snapshots bound recovery time.
- **Actor overhead**: One wallet actor per active player. Same passivation pattern as
  `PlayerSessionActor` (10-minute idle timeout). Memory footprint is small — the state is
  an int and a dictionary.
