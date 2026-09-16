## Context

See proposal.md — Why.

The constraints that shape the approach:

- The server only ever hears about completions. `POST /api/v1/progress/completions` is the
  single place an attempt is reported, and it is only called on success.
- `CompletionJournalActor` is a persistent entity holding raw per-attempt facts, one per
  player, behind a `CompletionJournalRegion`. It already persists a `Restarted` flag, but
  nothing aggregates it and it only ever sees attempts that ended in a clear.
- The client already tracks restarts per level in `useGame.ts` (`restartedLevels`), which is
  what supplies that flag today.
- The client is a React Router 7 data router (`createBrowserRouter`), so in-app navigation
  can be intercepted with `useBlocker`. Levels play at `/play` under `ImmersiveLayout`.
- Leaderboard rows are Mongo documents sorted and paged by the database; the hub reads them
  directly. Anything shown on a leaderboard has to exist as a field on those documents.
- Period leaderboard rows are built with `$inc`, and only when an attempt earned points.

## Goals / Non-Goals

**Goals:**

- One place that decides what an attempt outcome is, rather than three call sites counting
  their own way.
- Outcomes recorded whether or not the attempt earned any points.
- The player is told what leaving costs before it costs them.
- No stored document is rewritten and nothing is backfilled.

**Non-Goals:**

- No change to XP, scoring, stars, or the wallet.
- No attempt-level analytics beyond the counts the specs require; the journal keeps the raw
  facts if richer questions come later.
- No attempt tracking for the tutorial or the daily challenge in this change.
- No reconstruction of history — see the spec requirement on when counting begins.

## Decisions

### 1. The completion journal becomes the attempt journal

The counts live on `CompletionJournalActor`, which already persists one event per attempt
and already knows about restarts. It gains two further event types for the endings it has
never seen, keeps a running `(attempts, completions)` in its state, and answers a query for
them the way `PlayerWalletActor` answers `GetBalance`.

The alternative was a fifth per-player entity dedicated to statistics. It was rejected
because it would persist a second copy of facts this actor already writes, and the two
copies could disagree. The `servus-entity-regions` work removed four near-identical
registries specifically to stop that kind of duplication; adding a parallel entity here
would walk it back.

A consequence worth stating: the journal is no longer only about completions. Its name and
its persistence id (`completions-{playerId}`) both become slightly wrong. The persistence id
must not change — renaming it would orphan every existing journal — so the id stays as it is
and the naming drift is accepted rather than paid for with a migration.

### 2. Attempt endings are reported by the client, one endpoint

The client is the only party that knows an attempt started, because opening a level is a
client-side navigation. So it reports the ending too, through a single endpoint that takes
the level and the outcome.

Completions keep their existing endpoint — it already carries the move list the server
replays, and splitting that would mean two calls for the common case. The new endpoint
reports only the two endings the server cannot infer.

Idempotency matters here because both a modal confirmation and a `beforeunload` beacon can
fire for the same departure. Each attempt carries a client-generated id, and an ending for
an id the journal has already closed is ignored. That is also what satisfies the spec's
"counted once and only once".

### 3. A beacon for tab close, a blocker for in-app navigation

In-app navigation uses `useBlocker`, which suspends the navigation while the modal is up and
resumes or cancels on the answer. That path is reliable and gets the real modal.

Tab close uses `beforeunload` to trigger the browser's own prompt, and `navigator.sendBeacon`
to report the abandonment, because a normal `fetch` is cancelled when the document goes away.
A beacon is fire-and-forget with no response, which is why the spec says best-effort: a
dropped beacon means an attempt is never recorded, which is better than one recorded wrongly.

`sendBeacon` cannot set an `Authorization` header, so the endpoint accepts the player token
in the body for that call.

### 4. Counts reach the leaderboard the way XP already does

The completion flow's fire-and-forget block already asks the wallet for the authoritative XP
and writes it to the leaderboard row. It asks the journal for attempt counts in the same
place, with the same timeout and fallback shape, and writes them as `GamesPlayed` and
`GamesWon`.

Period rows are the part that is actually broken today: `UpsertPeriodLeaderboardAsync`
increments `GamesPlayed` but never `GamesWon`. It gains the second increment. Period rows
stay `$inc`-based rather than reading a total, because a period count is by definition the
attempts made inside it, which the entity does not track per period.

This leaves one gap: period rows are only written when an attempt earned points, so an
attempt that ends in a restart or an abandonment does not currently touch them. The period
upsert therefore moves out from behind that earning check, so a lost attempt counts against
the period win rate rather than vanishing from it.

### 5. No attempts means no win rate, not zero

The specs require distinguishing "has not played" from "has never won". The API reports the
win rate as absent rather than `0` when there are no recorded attempts, and the client
renders a dash. Without this, every established player reads 0% until their next attempt,
which is exactly the misleading number this change exists to remove.

## Risks / Trade-offs

- **Tab-close losses undercount** → `sendBeacon` is best-effort and mobile browsers
  frequently discard it when backgrounding. In-app navigation, the common case, is reliable.
  The spec states the weaker guarantee rather than implying one that cannot be met.
- **A modal on the way out is friction on the hot path** → It fires only for an unfinished
  attempt, never after a completion, so finishing a level and leaving is untouched. Judge it
  in play before shipping; the alternative is silently charging a loss the player never
  agreed to.
- **Attempt ids are client-generated** → A hostile client could report attempts that never
  happened, as it already could for completions. Win rate is cosmetic and carries no reward,
  so this is not worth server-side attempt issuance.
- **Two writers for the leaderboard row** → The completion flow writes totals while the
  abandon path writes counts. Both are upserts on the same document; the field sets are
  disjoint, so a lost race costs a stale count until the next attempt rather than a wrong one.

## Migration Plan

None, deliberately. No document changes shape, no journal is rewritten, and no history is
reconstructed. Deployment is a container rebuild; rollback is a revert, after which the new
event types sit unread in the journal and the leaderboard counts stop moving.

The first days after deploy will show small attempt counts and volatile win rates for
established players. That is the intended behaviour, not a bug to fix later.
