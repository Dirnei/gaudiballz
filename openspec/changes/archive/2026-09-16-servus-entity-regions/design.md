## Context

See proposal.md — Why.

The constraints that shape the approach:

- `Program.cs` builds the `ActorSystem` by hand (`ActorSystem.Create("puzzle", akkaConfig)`)
  with an inline HOCON string, and registers four wrapper singletons holding `IActorRef`s.
  `Akka.Hosting` is referenced but never called.
- `Servus.Akka` 0.3.14 targets net8.0 and depends on `Akka.Hosting` (>= 1.5.0) and
  `Servus` (>= 0.34.0). The project is net10.0 on Akka 1.5.71, so both constraints hold.
- `LocalEntityRegionActor` routes on `IEntityIdExtractor`; the default extractor reads
  `IWithEntityId.EntityId`. The existing command interfaces already carry the identity as
  `string PlayerId`.
- Entity ids become child actor names. `LocalEntityRegionActor.IsValidEntityId` rejects
  empty ids and `/`, `#`, `$`. Player ids are 32-character GUID hex, so they pass as-is;
  the current `WalletRegistryActor` escapes them with `Uri.EscapeDataString`, which for
  these ids is the identity function.
- Persistence ids are derived from the player id, not the actor path
  (`PersistenceId => $"wallet-{playerId}"`), so re-parenting entities under a region does
  not orphan any journal.

## Goals / Non-Goals

**Goals:**

- One implementation of entity-per-id routing, passivation, and restart limiting.
- Entity actors keep their own state and persistence ids unchanged.
- The message-handoff-during-passivation path is covered by a test that fails if it
  regresses, rather than being assumed correct.

**Non-Goals:**

- No consolidation of per-player state. The wallet stays an XP ledger, the completion
  journal stays raw facts. Merging them is a separate question with its own risk.
- No cluster sharding, no clustering, no multi-node deployment.
- No change to the HOCON persistence configuration beyond moving it into the
  `AddAkka` builder verbatim.
- No new statistics or counters. `win-rate-restarts` builds on this and is out of scope
  here.

## Decisions

### 1. Migrate to Akka.Hosting rather than construct regions by hand

`WithLocalEntityRegion<TKey>` is an `AkkaConfigurationBuilder` extension that registers the
region into `IActorRegistry`. Using it means adopting `AddAkka`.

The alternative is instantiating `LocalEntityRegionActor` directly with `system.ActorOf`
and keeping the wrapper singletons. That would work and would be a smaller diff, but it
keeps a second way of wiring actors alongside the library's own, and leaves `Akka.Hosting`
referenced-but-unused. Since the package is already a dependency, the migration costs a
signature change rather than a new dependency.

Endpoints move from `WalletRegistry wallet` to `IRequiredActor<WalletRegion> wallet`, where
the marker type replaces the wrapper class.

### 2. Marker types as registry keys, not the entity actor types

`WithLocalEntityRegion<TKey>` registers under `TKey`. Keying on the entity actor type
(`PlayerWalletActor`) would read as "inject the wallet actor" when what is injected is the
region in front of many wallets. Empty marker types named for the region
(`WalletRegion`, `PlayerRegion`, `CompletionJournalRegion`, `AchievementRegion`) keep the
call sites honest about what they hold.

### 3. Command interfaces implement IWithEntityId directly

`IPlayerCommand`, `IWalletCommand`, and `IJournalCommand` each already expose
`string PlayerId`. Each gains `IWithEntityId` with `string EntityId => PlayerId` as a
default interface member, so no record declaration changes and no custom extractor is
needed.

The alternative — a custom `IEntityIdExtractor` per region that pattern-matches the command
interface — avoids touching the interfaces but adds four small classes to replace one
default member each.

### 4. Passivation moves from the entity to the region

Entities currently call `SetReceiveTimeout` and tell their parent a `*Passivate` message.
The region sweeps on a timer instead, using the time it last routed a message to that
entity. The `SetReceiveTimeout` calls and the four passivate message types are deleted.

These are not identical: a receive timeout measures time since the entity last received
anything, while the region measures time since it last routed. They differ only for
messages an entity receives from somewhere other than the region — which, for these four
families, is nothing. Keep the existing ten-minute idle window.

### 5. InMemoryEntityIdStore, explicitly

`LocalEntityRegionOptions.EntityIdStore` defaults to `InMemoryEntityIdStore`, so a
restarted region starts empty and entities spawn on first message. `FileEntityIdStore`
would instead reload every entity id ever seen and respawn all of them in `PreStart`,
recovering each from its journal at once. For persistent entities with a growing player
base that is a recovery stampede at every deploy, for no benefit — nothing here needs a
warm entity before its first message. Set it explicitly so the choice is visible rather
than inherited.

### 6. Keep the wallet test seam, rebuilt on the registry

`WalletAuthorityFixture` proves the wallet-unavailable fallback by registering a gate actor
in place of the `WalletRegistry` singleton. With the singleton gone, the equivalent seam is
to register the gate into `IActorRegistry` under `WalletRegion` after the application's own
registration. The gate actor itself is unchanged.

## Risks / Trade-offs

- **A dropped message during entity handoff is silent** → The existing suite covers
  behaviour through the API, where a dropped completion looks like a slow one. Add a
  direct test that sends to an entity while it is passivating and asserts the message is
  delivered after the restart, so the path that motivated this change is the one under
  test.
- **`Servus.Akka` is pre-1.0 (0.3.14)** → The surface used here is small
  (`WithLocalEntityRegion`, `IWithEntityId`, `LocalEntityRegionOptions`). Pin the exact
  version in `Directory.Packages.props` rather than a range, so an upgrade is a deliberate
  commit.
- **Restart semantics change** → `WalletRegistryActor` supervises with
  `OneForOneStrategy(3, 30s, Restart)`, a rolling time window. `LocalEntityRegionActor`
  counts consecutive restarts per entity instead: after three it stops respawning that one
  and logs that it gave up. The entity is not dead for good — the next message addressed to
  it creates a fresh one on demand, and any successfully routed message clears the count.
  So a crash loop stops spinning on its own rather than restarting forever, which is the
  better behaviour, but it is a change in when an entity comes back.
- **Big diff across the slices** → The DI signature change touches six slices and
  `IndexInitializer` without changing their logic. Do it as a mechanical pass, separate
  from the region wiring, so review can skim it.

## Migration Plan

No data migration: persistence ids, journals, snapshots, and stored documents are all
untouched. Deployment is a normal container rebuild.

Rollback is a revert — because no stored shape changes, a rolled-back build reads exactly
the data the new one wrote.

Sequence the work so the suite is green at each step: introduce the dependency and marker
types, move one region at a time starting with the wallet (the only family with an existing
integration-test seam), then delete each registry actor once nothing references it.
