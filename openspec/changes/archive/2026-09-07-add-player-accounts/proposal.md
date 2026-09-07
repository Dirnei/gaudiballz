# Add player accounts

## Why

Progress is currently one number in browser storage. Clearing site data loses it, a private
window never had it, and opening the game on a phone starts again from level 1. Someone
forty levels in has nothing backing that up, and finding out the hard way is exactly the
kind of thing that ends a casual game for good.

The fix is not simply "add accounts". A signup wall on a free puzzle costs more players
than it saves, so the first launch must stay exactly as it is: tap and play, no forms. What
changes is that the progress being made belongs to a player record from the start, and that
a player can attach a passkey to that record whenever they feel like it — which is what
makes it recoverable and what lets it follow them to another device.

## What Changes

- Give every player a durable identity from first launch, with no signup and no interaction.
- Store progress against that identity rather than in the browser, so it survives a cleared
  browser and appears on any device the player signs in to.
- Let a player attach a **passkey** at any time, and sign in with it on another device. No
  password field anywhere, and no email required.
- Never ask. No prompt on level completion, no banner, no badge, no interstitial. The option
  sits in plain sight and waits to be found.
- Sign in on a second device, and merge the progress made there into the account rather than
  discarding either side.
- Keep playing when the network is not there. Progress made offline is kept and sent when a
  connection returns.

## Capabilities

**New Capabilities**:

- `player-identity` — who a player is, from an anonymous first launch through to a passkey
  they can sign in with anywhere.
- `level-progression` — what a player has completed, and how that is kept and merged.

**Modified Capabilities**: none.

## Impact

- Introduces persistence. MongoDB is in `docker-compose.yml` behind a profile and unused so
  far; this is the change that gives it a job, and it becomes a hard dependency of the
  server for the first time.
- Introduces the per-player session actor. Akka.NET has been a dependency since bootstrap
  without carrying any load; the single-writer-per-player property is the reason it was
  chosen and this is where it applies.
- Adds a passkey dependency on the server and uses the browser's built-in WebAuthn API on
  the client. No third-party identity provider, no redirect flow.
- Adds endpoints for identity and progress, and a place in the interface to create or use a
  passkey.
- The container gains a database, so the single-image deployment now needs a companion
  service. That is a real change to how the game is run and is called out rather than
  slipped in.

## Decisions

- **Anonymous first, always.** A player record is created silently on first launch. A
  passkey attaches to that same record, so nothing is lost at the moment of signing up and
  there is no "start again with an account" path.
- **Passkeys only.** No password, ever — including no recovery password and no emailed
  temporary one. OAuth may be added later as a convenience; a password may not.
- **A passkey is not a guarantee.** Losing every device with the passkey means losing the
  account, and the product should say so plainly rather than implying a safety net it does
  not have.
- **Merging favours the player.** When two devices disagree, the better progress wins per
  level rather than one side overwriting the other.
