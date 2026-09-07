# Design — bootstrap workspace

## Context

This change fixes decisions that are cheap now and expensive later: project boundaries,
the dependency graph, package version policy, and the test framework major version.
Nothing here is user-visible, which is why the change carries no spec — but several of
these choices constrain every change that follows.

## Vertical slices

Organised by capability, not by technical layer. A layered arrangement spreads one
capability across four projects, so adding a field to player identity means editing an
endpoint file, a DI module, an actor registry and a repository, each shared with every
other feature.

**Slices are folders, not projects.** The point of a slice is that a change touches one
directory; a directory achieves that without a project file, a reference graph entry and
a build node per feature. An earlier revision of this design made every slice its own
project and produced seventeen projects before a single rule had been written — the
ceremony was larger than the thing it organised.

```
src/
  Puzzle.Rules/          # board, moves, win condition, generation, solving. Zero deps.
  Puzzle.Rules.Tests/
  Puzzle.Server/         # host + persistence + actors; slices as folders inside
    PlayerIdentity/
  Puzzle.Server.Tests/
    PlayerIdentity/
```

`src/` contains project folders and nothing else. Grouping directories above the projects
were removed: they added a level of nesting that carried no information the project names
did not already carry.

**One boundary is enforced by test.** `Puzzle.Rules` depends on nothing — it has a
TypeScript twin in `client/src/engine`, and the conformance fixtures only hold the two in
step if its behaviour is a pure function of its inputs. `Puzzle.Rules.Tests` asserts this
two ways, because reflection over the compiled assembly is blind to a package declared
but not yet used, and reading the project file is blind to what arrives transitively.

Nothing else needs an architecture test. With two source projects the dependency graph
fits in a sentence, and rules like "slices must not reference each other" are enforced by
the fact that they are folders in one assembly.

## Tests live beside the code they test

Test projects sit in `src/`, next to what they cover, and mirror the slice folders
inside. A capability and the tests pinning its behaviour down review as one directory.

## Package version policy

Central Package Management via `Directory.Packages.props`, with every Akka.NET package
driven by a single `$(AkkaVersion)` property.

The Akka satellite packages (`Akka.Hosting`, `Akka.Cluster.Hosting`, the TestKits) ship
on their own cadence and trail core Akka. Letting a package bump move core ahead of its
satellites produces binding failures that surface as confusing runtime errors rather
than build errors. One property makes the coupling explicit and the upgrade deliberate.

## Test framework — xUnit v3 on Microsoft Testing Platform

**Revised during implementation.** This section originally specified xUnit v2, on the
grounds that no xUnit v3 Akka TestKit existed. Verifying at scaffold time — as this
design required — showed otherwise, and the naming is the trap:

| Package | xUnit line |
|---|---|
| `Akka.TestKit.Xunit2` | v2 |
| `Akka.TestKit.Xunit` (unsuffixed) | **v3** |
| `Akka.Hosting.TestKit` | v3, via the above |

There is no `Akka.TestKit.Xunit3`, which is what makes a package-name search conclude
v3 is unsupported. It is supported; the unsuffixed name simply moved to v3.

The mismatch is not theoretical. Pairing `Akka.TestKit.Xunit2` with
`Akka.Hosting.TestKit` puts `xunit.core` 2.9.3 and `xunit.v3.core` 3.2.2 in the same
compilation, and every `[Fact]` fails to resolve with CS0433.

**Decision: every test project uses xUnit v3**, with `xunit.v3`, `Akka.TestKit.Xunit`
and `FsCheck.Xunit.v3`.

Two version constraints follow and are worth recording, because they are not obvious
from the package list:

- `xunit.v3` is pinned to **3.2.2**, matching Akka's exact-version dependency on
  `xunit.v3.extensibility.core`, rather than the newer 4.0.0. Taking the latest breaks
  the constraint and fails restore.
- `FsCheck.Xunit.v3` is pinned to **3.3.4**; 3.4.0 pulls the 4.0.0 line and reintroduces
  the same conflict.

Test projects run on **Microsoft Testing Platform** rather than VSTest. Each is a
self-hosting executable that carries its own runner, so `Microsoft.NET.Test.Sdk` and
`xunit.runner.visualstudio` are not referenced at all — `xunit.v3` ships the MTP entry
point. `dotnet test` drives them once `TestingPlatformDotnetTestSupport` is set, which
`Directory.Build.props` applies to every project whose name ends in `.Tests`.

A code coverage extension is **not** wired up yet.
`Microsoft.Testing.Extensions.CodeCoverage` 18.9.0 pulls `Microsoft.Testing.Platform`
2.3.0, which `xunit.v3` 3.2.2 does not target; the run dies with a `TypeLoadException` on
`IDataConsumer`. Add coverage when the two version lines meet.

xUnit v3's analyzers require cancellation tokens to be threaded into any call that
accepts one, including Akka's `ExpectMsg`.

## MongoDB as a single-node replica set

`docker compose` runs Mongo with `--replSet` and an init container that issues
`rs.initiate()`.

A standalone `mongod` would be simpler, but it silently changes behaviour the tests
depend on: TTL indexes, majority write concern, and change streams all require a replica
set. Testing against a standalone and deploying against a replica set means the
integration suite validates a topology nobody runs. The cost is one extra container and
a few seconds of startup.

## Client structure

`client/src/` splits into `engine/`, `game/` and `skins/` from the first commit, with
`engine/` importing nothing from React or the DOM. The split exists now — while the
directories are nearly empty — because it is far harder to extract a pure engine from
component code later than to keep it separate from the start. The skin layer's job is to
prove the separation held: adding a skin must require no engine or game changes.

## What this change deliberately does not do

- No rules engine, no board type, no generator. Those are change 2, written against
  `docs/RULES.md` rather than improvised alongside scaffolding.
- No actors, no endpoints, no Mongo documents.
- No CI publish or deploy step. There is nothing to deploy, and a deployment pipeline
  written before the thing it deploys tends to encode guesses.

## Risks

**The scaffolding is wrong in a way only discovered later.** Mitigated by keeping it
thin: projects, references, and a build. Every file this change creates is either a
project definition, a config file, or a test that asserts a boundary.

**The MongoDB container test is occasionally flaky.** One Release run out of four failed
on `Honours_majority_write_concern` while the replica set was still coming up; three
consecutive re-runs passed. CI machines are slower than a developer laptop, so this will
recur there. If it does, the fix is an explicit readiness wait on the replica set rather
than a retry attribute, which would hide a real startup problem just as effectively as a
flaky one.

**MTP ignores VSTest-style filters silently.** `dotnet test --filter "Category=X"` runs
the whole suite and reports success, so a filtered gate can look like it is working while
testing nothing in particular. The conformance job uses `--filter-trait` for that reason.

**Docker is unavailable on a contributor's machine.** The domain and client test suites
have no container dependency and stay fast; only the integration suite requires Docker,
and it is a separately targetable filter.
