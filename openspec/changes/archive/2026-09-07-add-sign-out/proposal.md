# Add sign out

## Why

There is no way to leave an account. Once a browser has an identity it keeps it, which is
wrong on a shared or borrowed device and leaves anyone who signs in with the wrong passkey
stuck with it.

The reason it needs stating rather than just adding: signing out means something different
depending on whether a passkey is attached. With one, it is reversible — sign back in and
everything is there. Without one, the anonymous account has no way back in at all, and
signing out destroys it. Those two cases must not look the same.

## What Changes

- Add signing out, alongside the existing account controls.
- Return the player to a fresh anonymous identity afterwards, so the game stays playable
  without any interaction.
- Warn clearly, before it happens, when signing out is one-way — that is, when no passkey
  is attached.
- Send anything still queued before leaving, so work already done is not stranded on an
  account nobody can reach.

## Capabilities

**Modified Capabilities**:

- `player-identity` — gains signing out. Nothing about anonymous first launch, enrolment, or
  the no-prompting rule changes.

## Impact

- Client only. The server has no sessions to end: a token is a bearer credential, so leaving
  is a matter of forgetting it.
- Touches the account panel and the identity handling in the client.
- No new endpoint, no database change.

## Decisions

- **Queued completions are sent first, then dropped.** They belong to the account being
  left. Keeping them would attach work to whichever account comes next, which is worse than
  losing it — so the queue is flushed on the way out and cleared regardless of whether the
  flush succeeded.
- **Signing out does not delete the account.** It forgets it on this device. An enrolled
  account is reachable again with its passkey; an anonymous one is simply unreachable, which
  is why the warning exists.
