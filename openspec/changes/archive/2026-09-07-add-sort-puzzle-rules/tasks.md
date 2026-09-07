# Tasks — add sort puzzle rules

Tests come before the code that satisfies them throughout: the spec states the behaviour,
so there is no excuse for writing the implementation first and the assertions afterwards.

## 1. C# board model

- [x] 1.1 Write tests for board construction: capacity and tube-count bounds are validated,
      and a board rejects construction when a colour does not appear exactly `capacity`
      times
- [x] 1.2 Implement the immutable board and tube value types, addressed by position from
      zero
- [x] 1.3 Write tests for top item and topmost-run length, including an empty tube and a
      full single-colour tube
- [x] 1.4 Implement top-item and run-length queries

## 2. C# rules

- [x] 2.1 Write tests for every rejection reason in the `legality` requirement: same tube,
      out of range, empty source, full destination, colour mismatch
- [x] 2.2 Write the test that a legal-but-useless move — a single-colour source onto an
      empty tube — is **accepted**, since this is the rule most likely to be
      over-restricted by mistake
- [x] 2.3 Implement move legality
- [x] 2.4 Write tests for the `pour-amount` boundaries: run longer than space, run exactly
      equal to space, run shorter than space, and space of exactly one
- [x] 2.5 Implement move application, returning a new board
- [x] 2.6 Write the test that a rejected move leaves the board unchanged
- [x] 2.7 Write tests for the `win` requirement, including the split-colour case: two
      uniform but non-full tubes of the same colour must **not** read as solved
- [x] 2.8 Implement the win condition
- [x] 2.9 Write tests for `enumeration` order and repeatability
- [x] 2.10 Implement legal-move enumeration

## 3. C# properties

- [x] 3.1 Property: applying any legal move conserves the count of every colour
- [x] 3.2 Property: no tube ever exceeds capacity and no count goes negative
- [x] 3.3 Property: enumeration returns only legal moves, and every legal move appears
      exactly once
- [x] 3.4 Property: a solved board has no move that unsolves it without first being applied
      — that is, `IsSolved` depends only on board contents, not on history

## 4. Rule set versioning

- [x] 4.1 Write tests that a rule set is resolved by version and that an unknown version is
      refused rather than silently defaulting
- [x] 4.2 Implement the version constant and the version-to-implementation lookup
- [x] 4.3 Record version 1 as released, so later changes know it must remain available

## 5. TypeScript engine

- [x] 5.1 Write the client tests for legality, mirroring the C# rejection cases
- [x] 5.2 Implement the board model and legality in `client/src/engine`, importing nothing
      from React or the DOM — the existing lint rule enforces this
- [x] 5.3 Write the client tests for pour amounts at the same four boundaries
- [x] 5.4 Implement move application
- [x] 5.5 Write the client tests for the win condition including the split-colour case
- [x] 5.6 Implement the win condition and legal-move enumeration
- [x] 5.7 Add an undo stack, which is a client-only concern and deliberately absent from
      the shared surface

## 6. Conformance fixtures

- [x] 6.1 Write the fixture generator, emitting one file per requirement id with each case
      citing the requirement it exercises
- [x] 6.2 Generate and commit `conformance/v1/` fixtures covering legality (every rejection
      reason), pour amounts (all four boundaries), the win condition (including
      split-colour), and enumeration order
- [x] 6.3 Update `MANIFEST.json` with the file list and per-file hashes
- [x] 6.4 Write the coverage test: every requirement id in the capability spec must be
      cited by at least one fixture, so a rule cannot be added without fixtures
- [x] 6.5 Replace the placeholder C# conformance test with one that executes the fixtures
- [x] 6.6 Replace the placeholder client conformance test with one that executes the same
      fixtures
- [x] 6.7 Make the TypeScript suite emit its own trace over the shared inputs, and add the
      C# test asserting byte-equality — without this the fixtures only prove TypeScript
      matches a snapshot of C#
- [x] 6.8 Add the regeneration check: regenerating must not change committed bytes unless
      the manifest version changes

## 7. Wiring and cleanup

- [x] 7.1 Delete `docs/RULES.md`; the capability spec is the normative rulebook
- [x] 7.2 Confirm the conformance gate fails when an engine diverges — verified by making
      the TypeScript engine accept a pour onto a full tube of matching colour, watching the
      bidirectional trace report `legal=5` against `legal=6`, then reverting
- [x] 7.3 Confirm `Puzzle.Rules` still declares no dependencies
- [x] 7.4 Run every CI step locally and confirm green
