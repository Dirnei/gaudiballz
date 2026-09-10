# Gaudi Ballz

Browser-based colour-sorting puzzle game. Sort balls into tubes to clear the board.

## Quick Start

```bash
docker compose up -d --build    # runs at http://localhost:8123
```

Dev mode (backend + frontend separately):

```bash
dotnet run --project src/GaudiBallz.Server           # API on :5175
cd client && npm install && npm run dev               # Vite on :5173
```

## Project Structure

```
src/
  GaudiBallz.Rules/          # Pure domain: board, rules, scoring, generation (no I/O)
  GaudiBallz.Rules.Tests/    # xUnit tests for rules (includes conformance fixtures)
  GaudiBallz.Server/         # ASP.NET + Akka.NET: API, levels, progression, identity
  GaudiBallz.Server.Tests/   # Integration tests (Testcontainers for Mongo)
client/
  src/engine/                # TypeScript mirror of Rules: board, rules, solver, history
  src/game/                  # React UI: screens, components, hooks
conformance/v1/              # Shared fixtures proving TS and C# engines agree
openspec/                    # Capability specs and change tracking
```

## Architecture

**Client plays, server verifies.** The rules engine runs in the browser for instant
taps and offline play. The server replays submitted moves to confirm completions.
Two implementations of the same rules exist (TypeScript in `client/src/engine/`,
C# in `src/GaudiBallz.Rules/`) and they MUST agree exactly, enforced by shared
conformance fixtures.

**Levels are procedurally generated** server-side from a seed + difficulty parameters.
The same level ID always produces the same board. Uses a custom `Pcg32` PRNG (not
`System.Random`) because generation must be deterministic across .NET versions.

## Tech Stack

- **Backend**: C# / .NET 10, Akka.NET (actor model for player sessions), MongoDB
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite, Motion (animation)
- **Testing**: xUnit + Microsoft Testing Platform (.NET), Vitest + Testing Library (client)
- **Deployment**: Docker (single container serves API + built client)

## Testing

```bash
# Backend
dotnet test

# Client
cd client && npm test

# Conformance only (the gate that blocks merges)
dotnet test src/GaudiBallz.Rules.Tests -- --filter-trait "Category=Conformance"
cd client && npm run test:conformance
```

## Key Conventions

- **Conformance first**: Any change to rule behaviour changes the conformance fixtures
  first, then both engines. Never change one engine without the other.
- **No mocks for rules**: Rules tests use real boards and real moves. The engine is pure
  functions; there is nothing to mock.
- **Identity is passwordless**: Account creation uses passkeys (WebAuthn). No password
  field anywhere. Never introduce one.
- **No signup prompts**: Account creation is available but never pushed. No nags, no
  interstitials, no "secure your progress" banners.
- **Port 8123**: Docker maps to 8123 because 8080 and 8090 are taken on this machine.
- **OpenSpec for planning**: Use `openspec` for non-trivial changes. Specs describe
  observable behaviour only; implementation details go in `design.md`.
- **CI validates specs**: `openspec validate --all --strict` runs in CI. Every
  requirement needs SHALL/MUST, at least one scenario, and a Purpose of 50+ chars.

## Git

- Commit messages: subject line only, 74 chars max. No body, no trailers, no attribution.
- Always rebase, never merge. Linear history only.
