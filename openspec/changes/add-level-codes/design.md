## Context

See proposal.md — Why. Currently, players navigate freely with prev/next arrows and no
upper bound. Progress is tracked server-side per identity (`PlayerProgress.HighestCompleted`)
and locally in `localStorage['puzzle.lastLevel']`. Level content is fetched from
`GET /api/v1/levels/{levelId}` with no auth and cached for a year.

The level catalogue generates levels deterministically from a seed derived from the level
id via `Pcg32.SplitMix64` (see `LevelCatalogue.cs`). The same seeded approach can derive
level codes.

## Goals / Non-Goals

**Goals:**
- Gate level access to the player's level ceiling
- Provide each level with a short, server-generated code
- Let players enter a code to raise their ceiling without an account
- Preserve existing progress seamlessly on deploy

**Non-Goals:**
- Changing how completions are recorded (the progress API is untouched)
- Level codes for sharing or social features — the code is a recovery tool, not a social link
- Client-side code generation (the mapping must stay server-only)
- Akka.NET actors for code validation — a stateless endpoint is sufficient since there is
  no per-player state to coordinate; the code-to-level mapping is a pure function of the
  level id and a server secret

## Decisions

### 1. Code generation: HMAC-based, not sequential

**Decision**: Derive each level's code by computing an HMAC of the level id using a
server-side secret, then encoding a truncated digest into a short alphanumeric string
using an alphabet that excludes ambiguous characters (0, O, 1, I, l).

**Why**: The mapping must not be reversible from client source. A sequential scheme
(level 1 → "AAA", level 2 → "AAB") is trivially guessable. An HMAC with a secret key
means knowing one code tells you nothing about the next. The truncation to 6 characters
gives ~900 million possible codes from a 30-character alphabet — enough to be unique
across any realistic level count.

**Determinism**: The HMAC is a pure function of (level id, secret). The secret is a
configuration value, not a per-request random, so the same level always produces the same
code. No PRNG state is involved, so there is no cross-platform determinism concern beyond
the HMAC algorithm itself (HMAC-SHA256), which is standard and identical across .NET and
every other platform.

**Alternative considered**: Using the same `Pcg32.SplitMix64` seed as level generation —
rejected because the seed derivation is visible in client-side TypeScript source, so a
player could compute codes locally.

### 2. Server endpoint: stateless validation

**Decision**: Add `POST /api/v1/levels/unlock` accepting `{ code: string }` and returning
`{ levelId: int }` on success or 400 on invalid code. The endpoint iterates candidate
level ids (1 to a configured maximum, e.g. 10,000), computes each code, and returns the
match. Alternatively, maintain an in-memory lookup table (level id → code) built at
startup, so validation is O(1).

**Why**: The code-to-level mapping is not algebraically invertible (HMAC truncation is
one-way), so the server must search or pre-build a reverse lookup. An in-memory table of
10,000 entries is trivially small (~60 KB). Building it at startup makes each validation
O(1) with no database access.

No Akka.NET actor is needed — this is a stateless, side-effect-free lookup that does not
read or write player data.

**Alternative considered**: Storing codes in MongoDB — rejected because they are
deterministic and can be recomputed from the secret, so persisting them adds complexity
with no benefit.

### 3. Level gating: client-side enforcement with server-derived ceiling

**Decision**: The level ceiling is `max(serverHighestCompleted + 1, localUnlock)` where
`localUnlock` is stored in `localStorage['puzzle.unlockedLevel']` and set when a code is
entered or when progress loads. `goToLevel` in `useGame.ts` rejects navigation above the
ceiling.

**Why**: The gate is a UX constraint, not a security boundary. The server already does not
gate level content (levels are public, cacheable, and auth-free). Client-side enforcement
is sufficient because there is nothing to exploit — completing a level still requires a
verified move sequence.

**Alternative considered**: Server-side gating on the levels endpoint — rejected because
it would break the 365-day cache and require auth on a currently public endpoint, for no
security benefit.

### 4. Code display location

**Decision**: Show the level code as small muted text beneath or beside the level number
in the header. Tapping it copies to clipboard. No separate screen or menu needed.

**Why**: The code must be visible without extra taps (spec: "visible without opening a
menu or overlay"). The header already shows "Level {n}" and has room for a small code
underneath. Copy-on-tap is the most frictionless way to note it down on mobile.

### 5. Code entry: integrated into the account panel

**Decision**: Add a "Level code" section to the existing `AccountPanel` component — a
text input and a submit button. On success, update `localStorage['puzzle.unlockedLevel']`
and navigate to the unlocked level.

**Why**: The account panel already exists and is the natural home for identity and
progress-related actions. Adding a section there avoids creating a new overlay. The panel
is accessible without an account (it shows the anonymous state).

## Risks / Trade-offs

- **Code leaking**: If the server secret leaks, anyone can generate codes for any level.
  → Mitigation: The secret is a configuration value, not checked into source. Rotating
  it invalidates all existing codes, which is acceptable since codes are a convenience,
  not an entitlement. A rotation can re-derive the table at startup.

- **Code sharing**: Players can share codes with each other to skip levels.
  → Accepted: The game is free, single-player, and has no competitive aspect. Sharing
  a code skips content but harms no one. Players who share codes self-select out of the
  puzzle experience.

- **localStorage ceiling vs. server progress divergence**: If a player enters a code
  raising their local ceiling above their server progress, then signs in on another
  device, the code-based unlock is not there.
  → Accepted: Codes are a recovery tool for the current browser. Cross-device sync is
  the job of the passkey account.

## Migration Plan

- The levels endpoint is unchanged — no breaking change to existing cached responses.
- On first load after deploy, `unlockedLevel` in localStorage does not exist, so the
  ceiling falls back to `serverHighestCompleted + 1`. Existing players see exactly the
  levels they have completed, plus the next one.
- No database migration needed. The code table is computed at server startup.
