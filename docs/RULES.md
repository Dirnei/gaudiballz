# Sort puzzle rules — normative specification

**Status: stub. R1–R8 arrive in change `add-sort-puzzle-rules`.**

## What this document is for

Two implementations of these rules exist: `Puzzle.Domain` in C# on the server, and
`client/src/engine/` in TypeScript in the browser. The client plays and the server
verifies, so if the two ever disagree, a player solves a puzzle and is told they did not.
That is the worst failure mode in the system: it is silent, it looks like cheating
detection, and it produces one-star reviews rather than bug reports.

**This document is the arbiter, and neither implementation is.** When they disagree, the
one that departs from this document is wrong. When this document is unclear, it is fixed
here first and in the code second.

Every fixture in `conformance/v1/` cites the rule number it exercises, so a failing
fixture points at a rule rather than at a stack trace.

## Why the rules are numbered

Numbering is not decoration. Two rules in this family are exactly the kind that drift
apart between independent implementations, because both readings feel natural:

- Whether a pour that does not fit moves **part** of the run or is **rejected**.
- Whether a tube holding one colour but not filled counts as **done**.

An implementer who has to write `// R5` next to their code has to decide which rule they
are implementing. An implementer working from prose does not notice there was a choice.

## Scope

These rules govern board state, move legality, move application, move enumeration order,
and the win condition. They say nothing about how a board is generated, how a hint is
chosen, or how anything is rendered — those are separate concerns with their own specs,
and none of them may contradict this document.

## Versioning

The rule set carries a version, submitted with every solution as `rulesVersion`. Old
versions are never deleted: a player whose browser has cached an old build must be
verified against the rules they actually played. Change 2 establishes version 1.
