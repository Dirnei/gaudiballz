# Design — add player accounts

## Context

See proposal.md — Why. Three things in the current system shape the approach:

- The server is stateless today. `docker-compose.yml` carries MongoDB behind a `data`
  profile that nothing uses, and the single-image container has no companion service.
- Akka.NET has been a dependency since bootstrap and carries no load. The per-player
  single-writer session was the reason it was chosen.
- Levels are pure functions of a seed, so nothing about level content needs persisting.
  Only what a player has *done* is worth storing, which keeps the data model small.

## Goals / Non-Goals

**Goals**

- First launch unchanged: tap and play.
- Progress recoverable by the player, on any device, without a password.
- Offline play that loses nothing.

**Non-Goals**

- No email, no username, no profile, no display name. Nothing to fill in.
- No OAuth in this change. The stance allows it later as a convenience; adding it now would
  mean a redirect flow and a provider dependency for no gain.
- No leaderboards or social features. Progress here is private to the player.
- No server-side verification of completions. That is a separate concern and only matters
  once there is something to cheat *for*; there is nothing yet.

## Decisions

### Anonymous identity is a real record, not a placeholder

First launch creates a player document server-side and returns a token the browser keeps.
The alternative — keeping progress local until enrolment, then uploading — means the moment
of signing up is the moment most likely to lose data, which is precisely backwards.

The token is a bearer credential in browser storage. Losing it before enrolling loses the
account, which is the same exposure as today and is why enrolment exists.

### Passkeys via Fido2 (4.0.1)

`Fido2` and `Fido2.AspNet` are the maintained .NET WebAuthn implementation. Discoverable
credentials (resident keys) are required so sign-in needs no username: the browser offers
the credential and the server resolves the account from it. That is what makes "no username,
no email, no recovery code" achievable rather than aspirational.

**Passkeys need a secure context.** The browser refuses WebAuthn on plain HTTP other than
`localhost`, so signing in from a phone over the LAN — which is how this game is being
playtested — will not work without TLS. This is a deployment consequence, not a bug, and the
design records it rather than discovering it during testing.

### One session actor per player

Every command for a player goes through an actor keyed by their id: progress writes,
merges, enrolment. Single-writer removes the read-modify-write races that merging invites,
without a distributed lock or an optimistic-concurrency retry loop.

The actor holds no authoritative state that is not already persisted. It loads on first
message, passivates after an idle period, and is safe to restart at any point — a supervisor
restart reloads from MongoDB rather than losing anything.

### Merge per level, better wins

Progress is a map from level to best result, so merging is a per-key fold taking the lower
move count and the lower hint count. No timestamps, no conflict resolution policy, no "last
writer wins" — the operation is commutative and idempotent, which means a retried or
duplicated merge is harmless.

This is also why writes use `$min` and `$max` rather than reading and setting: the database
does the merge, so two devices submitting at once cannot lose one another's work.

### Offline is a queue, not a mode

Completions are appended to a local queue and drained when a request succeeds. The game does
not know or care whether it is online; it tries, and failures leave the item queued.

The queue lives in IndexedDB rather than `localStorage`, because it must survive the tab
closing mid-flight and `localStorage` is synchronous and size-limited. Each item carries a
client-generated id so a resend cannot double-count.

### The container gains a dependency

Single-image deployment ends here: the server needs MongoDB. `docker-compose.yml` moves
Mongo out of the `data` profile and the game waits on its health check. Worth stating
plainly because "one Dockerfile, no companion services" was an explicit earlier requirement
and this change spends it.

## Risks / Trade-offs

**A player loses every device with the passkey** → The account is unrecoverable, by design.
The only alternatives are a password or an email, both excluded. Mitigated by saying so
before enrolment and by supporting multiple passkeys, and softened in practice because
platform passkeys sync through the player's own account.

**Passkeys unavailable over LAN HTTP** → Playtesting on a phone cannot enrol until there is
TLS. Anonymous play is unaffected. Detected and stated in the interface rather than failing
obscurely.

**The anonymous token is lost before enrolment** → Same exposure as today. Not solvable
without asking for something at first launch, which is the thing that must not happen.

**MongoDB becomes a hard dependency** → Levels and play stay pure functions, so the game is
still playable when the database is down; only progress recording fails, and offline
queueing already covers exactly that case.

## Open Questions

None. TLS for LAN playtesting is a deployment task, not a design decision — the design is
the same either way.
