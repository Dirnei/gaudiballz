# Design

## Context

Stars come from the server: the campaign gets `attemptStars` from the completion result
(`progress.ts`), and the daily gets `completion.stars` from `/api/v1/daily/completions`. Both
solved overlays already have everything else the star rule needs on the client: move count,
par, elapsed ms, time target ms and hints used.

## Goals / Non-Goals

**Goals:**
- One pure function that both overlays use, so campaign and daily can't drift apart (the
  shared `GameBoard` exists for the same reason).

**Non-Goals:**
- Changing the star rule, or making the client the authority on stars.
- Showing how to earn a star on the board *during* play.

## Decisions

**Work out the reasons on the client from the attempt's own numbers.** A pure
`missedStarReasons({ moves, par, elapsedMs, timeTargetMs, hintsUsed })` in
`client/src/game/missedStarReasons.ts` returns a list of
`{ kind: 'hints' } | { kind: 'moves', over } | { kind: 'time', overSeconds }`, in that order.
- *Alternative*: have the server return the reasons with the completion. Rejected: it adds API
  surface for data the client already has, and it would not help an offline completion waiting
  in the queue.

**The server's star count decides whether to show anything.** The overlay renders the reasons
only when the server-reported stars are below 3. If the client somehow finds no reason while the
server reported fewer than 3 stars, the overlay shows nothing rather than guessing. Stars stay
authoritative on one side.

**Round the time up to 0.1s.** `formatTime` shows one decimal. The overage is computed as
`Math.ceil(overMs / 100) / 10` seconds, so 30.01s against a 30s target reads "0.1s", never "0.0s".
Missing par (`par <= 0`) or a missing time target skips that check.

**Placement.** One muted line per reason, directly under the stars row and above the bonus line,
so it reads as "why these stars". No determinism or actor concerns: this is client-only display
logic with no Akka or generation involvement.

## Risks / Trade-offs

- [The client's reasons disagree with the server's stars if the rule changes on one side only] →
  the function mirrors the `level-scoring` spec, and a unit test pins each spec scenario. A
  future rule change touches the spec, so both sides are updated together.
- [Adding text makes the overlay taller on small phones] → one short line per reason, at most
  three and usually one. Check it at phone width during implementation.
