# Bootstrap workspace

## Why

The repository is empty, so no later change has anywhere to land. Every subsequent
change in this project asserts behaviour through tests, and tests need a buildable
solution, a test runner, a local database, and a CI job that runs them. Establishing
that skeleton once — with the dependency boundaries already enforced — is cheaper than
retrofitting it around code that has already grown into the wrong shape.

## What Changes

- Add a .NET 10 solution organised as **vertical slices**: a dependency-free kernel
  (`Puzzle.Rules`, `Puzzle.Generation`, `Puzzle.Solving`), shared plumbing
  (`Puzzle.Contracts`, `Puzzle.Platform`), one exemplar feature slice
  (`Puzzle.PlayerIdentity`), a composition-root host, and two tools.
- Put **tests beside the code they test**, under `src/`: every project has a sibling
  `.Tests` project, so a capability and the tests pinning it down review as one
  directory.
- Enforce the dependency graph mechanically: the kernel may reference nothing but the
  base class library, and slices may never reference each other. Architecture tests
  assert both — by reading project files and by reflecting over compiled assemblies,
  since neither alone catches everything.
- Pin every package version centrally, with all Akka.NET packages driven by a single
  version property so core cannot drift ahead of its satellites.
- Add the Vite + React + TypeScript client skeleton with its `engine/`, `game/` and
  `skins/` directories, Tailwind, and the PWA plugin.
- Add `docker compose` for a local MongoDB replica set, so integration tests and local
  play use the same topology as production.
- Run tests on **Microsoft Testing Platform** rather than VSTest: each test project is a
  self-hosting executable.
- Add a CI workflow running `openspec validate --all --strict`, `dotnet test` and the
  client test suite.
- Add the empty `conformance/v1/` directory and its manifest, reserved for the
  cross-language fixtures that change 2 fills in.

## Capabilities

**New Capabilities**: none.

**Modified Capabilities**: none.

This change alters no observable behaviour — nothing is playable yet and no endpoint
exists. Specs describe behaviour, so there is no honest requirement to write here, and
inventing one to satisfy the validator would make the spec set less trustworthy. The
change declares `skip_specs: true` in its metadata instead.

## Impact

- Creates the entire source tree; touches no existing code because none exists.
- Introduces the project's permanent dependency set: MongoDB.Driver, Akka.NET plus
  Akka.Hosting, xUnit, FsCheck, Testcontainers, BenchmarkDotNet on the backend; React,
  Vite, Tailwind, Motion and the PWA plugin on the client.
- Fixes three decisions that are expensive to reverse later: the slice boundaries, the
  xUnit major version every test project shares, and the test platform underneath it.
- Requires Docker to be running for the integration test suite, but not for the domain
  tests, which stay dependency-free and fast.
