# Restrict sign out to accounts

## Why

Sign out is currently offered to anonymous players, which does not mean anything. Anonymous
*is* the signed-out state — there is no account to leave, no credential to stop presenting,
and nothing on the other side of the action except a different anonymous identity.

Worse, offering it created a hazard that only existed because the control was there: signing
out of an anonymous account makes it permanently unreachable, so the last change added a red
warning to protect players from a button that should not have been shown to them. Removing
the control removes the hazard, and a warning is a poor substitute for not asking the
question.

## What Changes

- Show sign out only when a passkey is attached. An anonymous player sees no such option.
- Remove the destructive-sign-out warning, which has nothing left to warn about: every
  remaining sign out is reversible with the passkey.

## Capabilities

**Modified Capabilities**:

- `player-identity` — sign out becomes conditional on being signed in, and the requirement
  covering irreversible anonymous sign out is removed.

## Impact

- Client only. The account panel and nothing else.
- Simplifies the panel: one path instead of two, and no red warning in a game that has
  nothing to warn about.
- The sign-out behaviour itself is unchanged, including flushing queued completions before
  the identity is forgotten.

## Decisions

- **No replacement control.** A player who wants to abandon an anonymous identity can clear
  their browser data, which is the same act by a more honest name. Building a button for it
  would be rebuilding the thing being removed.
