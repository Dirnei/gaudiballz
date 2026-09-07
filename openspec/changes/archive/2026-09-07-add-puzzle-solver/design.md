# Design — add puzzle solver

## Context

See proposal.md — Why. The constraint that shapes the approach: this runs in the browser,
on a phone, between two taps. It cannot block the interface and it cannot be allowed to
answer slowly, so every decision below trades completeness for a bounded answer.

## Goals / Non-Goals

**Goals**

- A verdict fast enough to run after every move without the player noticing.
- Honest verdicts. Never report a winnable position as lost.
- A hint that provably leads somewhere, not a plausible-looking move.

**Non-Goals**

- Not an optimal solver. The shortest solution is irrelevant here; a working next move is
  the whole product requirement.
- No server involvement. No endpoint, no C# counterpart, no conformance fixtures — the
  solver reads the rules but adds none, so there is nothing for two engines to disagree
  about.
- Not on the correctness path. Levels are solvable by construction at generation time; a
  solver bug degrades hints, it cannot produce an unsolvable level.

## Decisions

### Depth-first with memoisation, not breadth-first

Depth-first reaches *a* solution quickly, which is all a hint needs, and its memory stays
proportional to depth. Breadth-first would find the shortest solution and hold the whole
frontier in memory — paying for optimality nobody asked for, on a phone.

The search is iterative with an explicit stack rather than recursive. Board sequences run
to a few hundred moves and a blown call stack in a browser tab is unrecoverable.

### Canonicalisation by sorting tubes

Tube order carries no meaning: a board with tubes `[AAB][C][]` is the same puzzle as
`[][C][AAB]`. Without folding those together the search re-explores the same position once
per permutation, which is the difference between a search that finishes and one that does
not.

Positions are keyed by their tube contents sorted into a canonical order, then joined into
a string. A string key is unglamorous but exact — no hashing, so no chance of two different
positions colliding and a real solution being pruned away.

### Move ordering

Moves are tried in an order that reaches a solution sooner: completing a colour first, then
pours onto a matching colour, then pours into an empty tube last. Pouring into an empty tube
is the move most often available and least often useful, so trying it last avoids a large
volume of shuffling that achieves nothing.

Moves that undo the previous move are skipped, as is moving a whole single-colour tube onto
an empty one — legal under the rules, but a pure relabelling that cannot make progress.

### Three verdicts, and the honesty rule

`winnable` and `dead` are claims; `unknown` is the absence of one. **dead** is only returned
when the search exhausted every reachable position, which for these board sizes is common
enough to be useful — a genuinely stuck board usually has very few moves left.

Reporting `unknown` as `dead` would tell a player their winnable position is lost, which is
worse than saying nothing at all. The type makes the three cases distinct so a caller cannot
collapse them by accident.

### Where it runs

In the browser, in `client/src/engine`. An earlier design put hints on the server and then
identified free unlimited hints as the easiest way for an idle tab to burn the host's CPU.
On the client the cost is the player's own device, the answer arrives in one frame, and it
works with no connection — which the offline requirement needs anyway.

## Risks / Trade-offs

**The search is too slow on the largest boards** → Budgeted in both nodes and wall clock, so
the failure mode is `unknown` rather than a frozen tab. Late levels are the tightest, and
tight positions have the fewest moves, so the hardest boards to play are the cheapest to
search. Measure before choosing the final budget rather than guessing.

**Checking after every move costs too much** → The check runs on the position after each
move, which is the only way to catch a dead board at the moment it happens. If measurement
says otherwise, the fallback is to check only when few moves remain, since that is when
positions die.

**A player disagrees with a `dead` verdict** → It is a proof by exhaustion, not a heuristic,
so it is either right or the rules engine is wrong. The same engine is already held to the
cross-language conformance fixtures.

## Open Questions

None. The budget values are a measurement, not a decision — they get set from what the
search actually costs on real late-game boards.
