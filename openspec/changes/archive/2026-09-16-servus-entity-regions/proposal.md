## Why

The server runs four per-player actor families, and each one carries its own hand-written
registry: `PlayerRegistryActor`, `WalletRegistryActor`, `CompletionJournalRegistryActor`,
and `AchievementRegistryActor`. The four bodies are the same forty-odd lines copied four
times — a child dictionary, a passivating dictionary, buffer-while-stopping, rehydrate on
`Terminated`, replay the buffer. Only the command interface and the passivate message
differ.

That duplication is the kind that hides bugs rather than announces them. The
buffer-while-passivating dance exists so a message arriving in the gap between "stop the
child" and "child is gone" is not dropped, and a completion going missing is invisible
until someone's progress is wrong. Four copies means four places to get it right and four
places to fix it.

`Servus.Akka` provides `LocalEntityRegionActor`, which is that pattern as a library
component, with entity-per-id routing, passivation, and restart limiting handled once. It
gives local entity regions without requiring a cluster, which suits a single-container
deployment. Adopting it deletes the four copies.

## What Changes

- The four registry actors are replaced by `Servus.Akka` local entity regions, one per
  entity type, registered through `Akka.Hosting`.
- Actor system construction moves from a hand-built `ActorSystem.Create` to
  `builder.Services.AddAkka(...)`. `Akka.Hosting` is already a package reference and is
  currently unused.
- The four wrapper singletons (`PlayerRegistry`, `WalletRegistry`, `AchievementRegistry`,
  `CompletionJournalRegistry`) are replaced by Akka.Hosting's `IRequiredActor<T>`, so
  endpoints resolve regions through the actor registry instead of bespoke holder classes.
- Entities stop asking their parent to passivate them. `SetReceiveTimeout` and the four
  `*Passivate` messages give way to the region's own idle sweep.
- Command interfaces (`IPlayerCommand`, `IWalletCommand`, `IJournalCommand`) gain
  `IWithEntityId` so the default entity-id extractor can route them.
- No endpoint, response body, or stored document changes. No capability's observable
  behaviour changes, so this change declares `skip_specs`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

_(none — this change opts out of specs via `skip_specs: true`. It replaces the actor
topology behind existing behaviour; every endpoint returns what it returned before, and no
spec describes the registries being removed.)_

## Impact

- **Server**: `Program.cs` actor wiring; the registry actor in `PlayerSession.cs`,
  `PlayerWallet.cs`, `CompletionJournal.cs`, and `AchievementActors.cs`; the DI signatures
  of `ProgressionSlice`, `HubSlice`, `ProfileBallSlice`, `AchievementsSlice`,
  `PlayerIdentitySlice`, and `IndexInitializer`.
- **Tests**: `WalletAuthorityFixture` replaces the `WalletRegistry` singleton to gate the
  wallet and needs the equivalent seam against the new registration. `ActorTests`,
  `PlayerSessionTests`, `WalletActorTests`, and `AchievementActorTests` construct entities
  or registries directly.
- **Client**: No changes.
- **Dependencies**: Adds `Servus.Akka` (0.3.14) and its `Servus` (0.34.0) dependency. Starts
  using the already-referenced `Akka.Hosting`.
- **Risk**: This is a behaviour-preserving refactor whose safety net is the existing suite —
  344 backend tests must pass unchanged. A regression here is silent (a dropped message),
  not loud, so the entity-handoff path needs a test of its own rather than trusting
  coverage that already exists.
