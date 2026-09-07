# Add sort puzzle rules

## Why

Nothing is playable yet. The board, the legal-move rule and the win condition are the
foundation every later capability rests on — generation, verification, hints and the
whole client all express themselves in these terms.

This capability is unusual in that it is implemented **twice**: in C# on the server, which
verifies completions, and in TypeScript in the browser, which plays them. If the two ever
disagree, a player solves a puzzle and is told they did not. That failure is silent, looks
like false cheating detection, and produces one-star reviews rather than bug reports. So
this change delivers not just the rules but the machinery that keeps both implementations
honest: a numbered specification that arbitrates between them, and shared fixtures that
both test suites run against.

## What Changes

- Define the board: tubes as stacks of coloured items, a fixed capacity, a fixed number of
  colours.
- Define move legality, move application, and how much a pour moves when the destination
  cannot take the whole run.
- Define the win condition.
- Define a deterministic order for enumerating legal moves, so hints and fixtures are
  reproducible rather than dependent on iteration order.
- Introduce a **rules version**, submitted with every solution, so a player running a
  stale cached build is verified against the rules they actually played.
- Fill `conformance/v1/` with fixtures both engines must satisfy, replacing the empty
  manifest, and turn the currently-trivial conformance gate in CI into a real one.
- **Remove `docs/RULES.md`.** The previous change left it as a stub promising a numbered
  rulebook, but this capability's spec is that rulebook. Two normative documents
  describing the same rules is the situation the arbiter is supposed to prevent, so the
  spec is the single source and fixtures cite its requirement ids.

## Capabilities

**New Capabilities**:

- `sort-puzzle-rules` — the board model, move legality, move application, move enumeration
  order, and the win condition, stated as behaviour both implementations must exhibit
  identically.

**Modified Capabilities**: none. This is the first capability in the project.

## Impact

- Adds behaviour to `src/Puzzle.Rules` (C#) and `client/src/engine` (TypeScript), which are
  currently skeletons.
- Adds fixture files under `conformance/v1/` and makes the existing CI conformance job
  meaningful; that job blocks merges on both the C# and client sides.
- Deletes `docs/RULES.md`; anything that referred to it points at the capability spec.
- Fixes the shape of every later capability: generation produces boards in this model,
  verification replays moves through these rules, hints choose among moves enumerated in
  this order.
- No persistence, no HTTP, no actors. The rules are a pure function of their inputs, which
  is what makes them fixturable — `Puzzle.Rules` keeps its zero-dependency guarantee.

## Decisions

Two rules in this family are the kind that drift silently between independent
implementations, because both readings feel natural. Both are settled here rather than
left to whichever engine is written first.

- **A pour that does not fit moves as many items as fit**, rather than being rejected.
  This matches the published games in the genre and is the more forgiving rule: partial
  pours open up positions that would otherwise be dead ends.
- **A tube counts as finished only when it is empty, or holds one colour AND is full.**
  Without the fullness clause, a colour split across two uniform-but-partial tubes would
  wrongly count as solved.
