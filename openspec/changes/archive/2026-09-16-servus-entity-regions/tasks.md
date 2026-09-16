## 1. Dependency and shared pieces

- [x] 1.1 Add `Servus.Akka` 0.3.14 to `Directory.Packages.props` as an exact pin (not a range) and reference it from `GaudiBallz.Server.csproj` via `dotnet add package`
- [x] 1.2 Add marker types `PlayerRegion`, `WalletRegion`, `CompletionJournalRegion`, `AchievementRegion` for use as `IActorRegistry` keys
- [x] 1.3 Add `IWithEntityId` to `IPlayerCommand`, `IWalletCommand`, and `IJournalCommand` with `string EntityId => PlayerId` as a default interface member
- [x] 1.4 Confirm `dotnet build` succeeds with the dependency in place and nothing yet rewired

## 2. Actor system construction

- [x] 2.1 Replace the hand-built `ActorSystem.Create` in `Program.cs` with `builder.Services.AddAkka("puzzle", ...)`, carrying the existing persistence HOCON across verbatim (including the `MongoDbReadJournal.DefaultConfiguration()` fallback and the spliced persistence connection string)
- [x] 2.2 Verify `LevelLeaderboardProjection` still resolves `ActorSystem` from DI and starts without the host stopping
- [x] 2.3 Run `dotnet test` — all tests pass with the actor system hosted but the four registries unchanged

## 3. Wallet region (first, because it has a test seam)

- [x] 3.1 Register the wallet as a local entity region via `WithLocalEntityRegion<WalletRegion>`, with a ten-minute `PassivateIdleEntityAfter` and an explicit `InMemoryEntityIdStore`
- [x] 3.2 Remove `SetReceiveTimeout` and the `WalletPassivate` handling from `PlayerWalletActor`, and delete the `WalletPassivate` message
- [x] 3.3 Replace `WalletRegistry` injection with `IRequiredActor<WalletRegion>` in `ProgressionSlice`, `HubSlice`, and `IndexInitializer`, and delete the `WalletRegistry` wrapper class
- [x] 3.4 Rebuild the `WalletAuthorityFixture` gate seam against the `IActorRegistry` registration, keeping `WalletGateActor` unchanged
- [x] 3.5 Delete `WalletRegistryActor`
- [x] 3.6 Run `dotnet test` — all tests pass, including the five wallet-authority tests

## 4. Remaining three regions

- [x] 4.1 Move the player session to `WithLocalEntityRegion<PlayerRegion>`, strip `SetReceiveTimeout`/`Passivate` from `PlayerSessionActor`, replace `PlayerRegistry` injection in `ProgressionSlice`, `HubSlice`, and `ProfileBallSlice`, and delete `PlayerRegistryActor` and the wrapper
- [x] 4.2 Move the completion journal to `WithLocalEntityRegion<CompletionJournalRegion>`, strip its passivation, replace `CompletionJournalRegistry` injection in `ProgressionSlice`, and delete `CompletionJournalRegistryActor` and the wrapper
- [x] 4.3 Move achievements to `WithLocalEntityRegion<AchievementRegion>`, strip its passivation, replace `AchievementRegistry` injection in `ProgressionSlice`, `PlayerIdentitySlice`, and `AchievementsSlice`, and delete `AchievementRegistryActor` and the wrapper
- [x] 4.4 Confirm no `*Registry` wrapper class, `*RegistryActor`, or `*Passivate` message remains in `src/GaudiBallz.Server`
- [x] 4.5 Run `dotnet test` — all tests pass

## 5. Tests for the path that motivated the change

- [x] 5.1 Write a test that sends a command to an entity while it is passivating and asserts the message is delivered to the restarted entity rather than dropped
- [x] 5.2 Write a test that asserts an idle entity is passivated after the configured window and that its persisted state is recovered on the next message
- [x] 5.3 Update `ActorTests`, `PlayerSessionTests`, `WalletActorTests`, and `AchievementActorTests` where they construct registries directly

## 6. Verification

- [x] 6.1 Run `dotnet test` — all 344 backend tests pass
- [x] 6.2 Run `cd client && npm test` — all 300 client tests pass, confirming no API surface moved
- [x] 6.3 Rebuild the Docker image and verify at http://localhost:8123
- [x] 6.4 Complete a level against the container and confirm XP, leaderboard, and activity feed are unchanged from before the refactor
- [x] 6.5 Restart the container and confirm wallet balances survive, proving entity persistence ids were not disturbed
