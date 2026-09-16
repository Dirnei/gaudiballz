## 1. Wallet event types and messages

- [x] 1.1 Define `PointsCredited` event record (Category enum, Level, Amount, Timestamp)
- [x] 1.2 Define `PointsAdjusted` event record (Category, Level, OldAmount, NewAmount, Timestamp)
- [x] 1.3 Define `CreditPoints` command, `GetBalance` query, and their response types (`CreditResult`, `BalanceResult`)
- [x] 1.4 Define `WalletState` (Balance int, LevelBaseCredits dictionary) with Apply methods for each event type
- [x] 1.5 Define `WalletSnapshot` record for Akka.Persistence snapshot serialization

## 2. Wallet actor

- [x] 2.1 Write tests for the wallet actor: base-score credit updates balance, bonus credit updates balance, duplicate base-score with lower amount is a no-op, improved base-score produces adjustment then credit, GetBalance returns current balance, recovery from journal restores state, recovery from snapshot + journal restores state
- [x] 2.2 Implement `PlayerWallet` as `ReceivePersistentActor` with persistence id `wallet-{playerId}`: persist events, apply to state, reply with `CreditResult`, snapshot after every N events
- [x] 2.3 Implement `WalletRegistry` actor (route `IWalletCommand` by PlayerId, create/passivate children, same pattern as `PlayerRegistryActor`)
- [x] 2.4 Register `WalletRegistry` in `Program.cs` and expose it as a singleton service (`WalletRef` or similar wrapper)

## 3. Completion flow integration

- [x] 3.1 Write tests for the completion flow: verified completion sends base-score credit to wallet, first-clear bonus sends credit, no-hint bonus sends credit, streak bonus sends credit, replay bonus sends credit, time-beat bonus sends credit, star-rating improvement sends adjustment via base-score credit
- [x] 3.2 Modify the fire-and-forget block in `ProgressionSlice` to Tell `CreditPoints` to the wallet for each applicable earning (base score + each bonus)
- [x] 3.3 In the fire-and-forget block, Ask the wallet for `GetBalance` and use the result for the leaderboard upsert instead of `updatedProgress.TotalPoints + bonus.Total`

## 4. Global leaderboard transition

- [x] 4.1 Write tests verifying that the all-time leaderboard entry uses the wallet balance, not the progress-derived total
- [x] 4.2 Modify `UpsertLeaderboardAsync` call in the fire-and-forget block to pass the wallet balance as `totalPoints`
- [x] 4.3 Add a consistency-check log warning: if wallet balance diverges from `progress.TotalPoints + bonus.Total` by more than a threshold, log a warning (safety net during transition)

## 5. Progress API transition

- [x] 5.1 Write tests verifying that the progress endpoint returns wallet balance as `totalPoints`
- [x] 5.2 Modify the progress GET endpoint in `ProgressionSlice` to Ask the wallet for `GetBalance` and use it for the `totalPoints` field in the response
- [x] 5.3 Verify rank computation in the progress response uses the wallet balance

## 6. Migration

- [x] 6.1 Write tests for the migration: existing player with known progress gets wallet balance equal to their TotalPoints, anonymous player gets migrated, re-running migration does not duplicate credits, player with zero progress is skipped
- [x] 6.2 Implement `BackfillWalletAsync` in `PuzzleStore` or `IndexInitializer`: iterate all ProgressDocuments grouped by player, send BaseScore credit per level + Migration credit for accumulated BonusPoints, skip players whose wallet already has a non-zero balance
- [x] 6.3 Wire the migration into `IndexInitializer` to run on startup (same pattern as leaderboard backfill)

## 7. End-to-end verification

- [x] 7.1 Run `dotnet test` — all existing tests pass, new wallet + integration tests pass
- [x] 7.2 Rebuild Docker image and verify at http://localhost:8123
- [x] 7.3 Complete a level as a new player, verify wallet balance matches displayed XP
- [x] 7.4 Improve a star rating on a level, verify wallet adjustment produces correct net delta
- [x] 7.5 Verify global leaderboard reflects the wallet balance
- [x] 7.6 Verify rank tier matches the wallet balance
- [x] 7.7 Verify migration: existing player's XP is unchanged after restart with the wallet enabled
