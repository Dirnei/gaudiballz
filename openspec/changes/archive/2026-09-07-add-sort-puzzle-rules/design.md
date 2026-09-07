# Design — add sort puzzle rules

## Context

See proposal.md — Why. The constraint that shapes everything below is that this capability
ships as two implementations that must not diverge: `src/Puzzle.Rules` in C# and
`client/src/engine` in TypeScript. `Puzzle.Rules` currently declares no dependencies and a
test enforces that; the rules must be expressible without breaking it.

## Goals / Non-Goals

**Goals**

- One specification, two implementations, proven identical by shared fixtures.
- A representation cheap enough that the solver and the verifier, both arriving later, can
  use it without a rewrite.
- Fixtures generated from a single source so they cannot drift from the spec by hand-edit.

**Non-Goals**

- No level generation, no solver, no verifier. They arrive in later changes and consume
  this one.
- No rendering, no input handling, no animation.
- No performance tuning beyond choosing a representation that does not preclude it.
  Benchmarks arrive with the solver, which is what makes them meaningful.

## Decisions

### The specification is the arbiter, not either implementation

`openspec/specs/sort-puzzle-rules/spec.md` is normative. When the engines disagree, the
one departing from the spec is wrong; when the spec is unclear, it is fixed there first
and in code second. Each requirement carries a short fixture id (`legality`,
`pour-amount`, `win`, `enumeration`) and every fixture cites one, so a red fixture points
at a rule rather than at a stack trace.

*Alternative considered:* a separate `docs/RULES.md` rulebook, as the previous change
anticipated. Rejected — two normative documents describing the same rules is exactly the
drift the arbiter exists to prevent. That file is deleted.

### Board representation: immutable value type, copy on apply

A board is a small immutable value; applying a move returns a new board rather than
mutating in place.

The cost is copying a board per move. That is acceptable and worth paying because the
solver arriving in a later change explores hundreds of thousands of states and is far
simpler to write correctly against immutable states — no undo bookkeeping, no accidental
aliasing between search branches. The verifier likewise becomes a fold over a move list.

Capacity and tube count are bounded (**capacity ≤ 8, tubes ≤ 16**), comfortably above any
level this game will ship, which is what keeps a board small enough for this to be cheap.
Those bounds are validated when a board is constructed rather than assumed.

*Alternative considered:* a mutable board with an undo stack, which is how the client will
naturally want to work. Rejected for the shared core, but note the TypeScript engine is
**not required to match this internally** — the fixtures test behaviour, not
representation, so the client may use mutable arrays and an undo stack if that suits it.
Only observable behaviour is specified.

### Server-side undo does not exist

Undo is a client concern. The server only ever sees the net move list of a completed
puzzle, so the rules define no inverse operation. This keeps the shared surface — and
therefore the fixture set — smaller.

### Fixtures are generated, then committed

A small generator in the C# project emits `conformance/v1/*.json` from a hand-written set
of board scenarios; the files are committed and both suites read them. CI regenerates and
fails if the committed bytes differ without a manifest version bump.

*Alternative considered:* hand-writing the JSON. Rejected — hand-maintained fixtures rot,
and the interesting cases (the split-colour win case, every rejection reason, partial
pours at each boundary) are tedious enough to enumerate by hand that they would be
enumerated incompletely.

**Bidirectionality matters here.** Fixtures generated only from C# prove that TypeScript
matches a snapshot of C#, not that the two agree on inputs nobody thought to snapshot. So
the TypeScript suite also emits its own trace over the same inputs, and a C# test asserts
byte-equality against it. Without this, a shared misreading of the spec by whoever writes
the generator goes undetected.

### Rule set versioning is introduced now, cheaply

A version constant and a lookup that resolves a version to an implementation. With one
version this is nearly free; retrofitting it after the first rules bug ships is not,
because by then submissions exist that were played under rules no longer available.

## Risks / Trade-offs

**The two engines pass the fixtures but differ on an unfixtured input** → Fixtures are
generated from enumerated scenarios rather than hand-picked examples, and are
bidirectional so neither implementation is the reference. Coverage is asserted: the
manifest lists which requirement each fixture cites, and a test fails if any requirement
in the spec has no fixture citing it.

**Partial pours are the likeliest divergence** → They are the rule where two natural
readings exist, which is why the spec settles them explicitly. Fixtures cover the
boundaries specifically: run longer than space, run exactly equal to space, run shorter
than space, and space of exactly one.

**The bounded capacity and tube count turn out too small** → They are validated at
construction and stated in one place. Raising them is a code change and a fixture
regeneration, not a redesign, because nothing outside the board type depends on the
specific values.

**Immutability makes the client feel sluggish** → Unlikely at ~30 items, and the
TypeScript engine is explicitly free to use a different internal representation. If it
does, the fixtures still hold it to the same behaviour.

## Migration Plan

Nothing to migrate — no released rules exist and no submissions have been recorded. This
change establishes rule set version 1. Deleting `docs/RULES.md` affects nothing that runs;
it was a stub.

## Open Questions

None. The two genuinely ambiguous rules — partial pours and the win condition — are
settled in the spec rather than deferred, because both would change the fixture set and
the task breakdown.
