# Tasks — bootstrap workspace

## 1. Repository foundations

- [x] 1.1 Add `.gitignore` covering .NET build output, Node modules, Vite output, user
      settings, and local environment files
- [x] 1.2 Add `global.json` pinning SDK 10.0.102 with `rollForward: latestFeature`
- [x] 1.3 Add `.editorconfig` with the C# and TypeScript formatting conventions
- [x] 1.4 Add `Directory.Build.props` setting `net10.0`, nullable enabled, warnings as
      errors, and deterministic builds for every project

## 2. Package version policy

- [x] 2.1 Add `Directory.Packages.props` with central package management enabled
- [x] 2.2 Declare a single `$(AkkaVersion)` property and drive every Akka package from it
- [x] 2.3 Verify the current published versions of Akka, Akka.Hosting, the TestKits,
      MongoDB.Driver and FsCheck at scaffold time rather than assuming them
- [x] 2.4 Confirm whether an xUnit v3 Akka TestKit has shipped, and pin every test
      project to one major. It has: `Akka.TestKit.Xunit` (unsuffixed) is the v3 package
      and `Akka.Hosting.TestKit` requires it, so the solution uses **v3**, not the v2 the
      design originally assumed. `design.md` records the correction and the two version
      pins it forces

## 3. Solution and source projects

- [x] 3.1 Create the solution file
- [x] 3.2 Create `Puzzle.Rules` with no references of any kind,
      `InvariantGlobalization` and `IsAotCompatible` set
- [x] 3.3 Create `Puzzle.Server` as an ASP.NET Core minimal API holding slices as
      folders, with Mongo and Akka
- [x] 3.4 Establish the slice shape with `PlayerIdentity`: an `ISlice` implementation
      that registers its own services and endpoints, so adding a capability is a folder
      plus two lines in `Program.cs`
- [x] 3.5 Keep `src/` free of grouping directories — project folders only
- [x] 3.6 Confirm `dotnet build` succeeds

## 4. Dependency boundary enforcement

- [x] 4.1 Assert `Puzzle.Rules` depends on nothing, checked both by reading the project
      file and by reflecting over the compiled assembly. Neither alone suffices:
      reflection is blind to a package declared but not yet used, and the project file is
      blind to what arrives transitively
- [x] 4.2 Prove the test actually fails: add a forbidden package reference, confirm red,
      then revert
- [x] 4.3 Do not add further architecture tests. With two source projects the graph fits
      in a sentence, and slice isolation follows from slices being folders

## 5. Test projects, beside the code they test

- [x] 5.1 Place test projects in `src/` next to what they cover, mirroring the slice
      folders inside
- [x] 5.2 Wire `Puzzle.Rules.Tests` with FsCheck and prove properties actually run
- [x] 5.3 Wire `Puzzle.Server.Tests` with the Akka TestKit, Testcontainers and
      `WebApplicationFactory`, and prove an actor system starts, a real MongoDB replica
      set accepts a TTL index and a majority write, and the application boots
- [x] 5.4 Run on Microsoft Testing Platform: no `Microsoft.NET.Test.Sdk`, no
      `xunit.runner.visualstudio` — each test project hosts its own runner
- [x] 5.5 Confirm `dotnet test` runs green across both projects

## 6. Local database

- [x] 6.1 Add `docker-compose.yml` running MongoDB with `--replSet`
- [x] 6.2 Add the init step issuing `rs.initiate()` so the set is usable on first start
- [x] 6.3 Verify a TTL index and a majority-write-concern write both succeed against it

## 7. Client skeleton

- [x] 7.1 Scaffold the Vite React TypeScript project under `client/`
- [x] 7.2 Create the `engine/`, `game/` and `skins/` directories with their entry points
- [x] 7.3 Add Tailwind, Motion, and the PWA plugin with a web app manifest
- [x] 7.4 Add Vitest with a placeholder test and a `test:conformance` script that
      currently passes trivially
- [x] 7.5 Add a lint rule forbidding React and DOM imports from `engine/`, and prove it
      fires. Vite 8 scaffolds oxlint rather than ESLint, so the rule is oxlint's
      `no-restricted-imports` in an `src/engine/**` override
- [x] 7.6 Confirm `npm run build` and `npm test` both succeed

## 8. Conformance directory

- [x] 8.1 Create `conformance/v1/` with a `MANIFEST.json` carrying `rulesVersion` 1 and
      an empty file map
- [x] 8.2 Add `docs/RULES.md` as a stub that states its own purpose and records that
      R1-R8 arrive in the next change

## 9. Continuous integration

- [x] 9.1 Add the workflow running `openspec validate --all --strict --no-interactive`
- [x] 9.2 Add the `dotnet build` and `dotnet test` steps
- [x] 9.3 Add the client install, build and test steps
- [x] 9.4 Run every CI step locally and confirm it passes: spec validation, Release
      build, both test projects, the trait-filtered conformance gate, and the client
      lint, build and test. The GitHub Actions run itself is verified on first push,
      since this repository has no remote yet
