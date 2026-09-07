# Add usernames

## Why

Two problems, both about the player not being able to see where they stand.

The account has no name. There is nothing to identify it by, nothing to recognise, and
nothing the game can show you to confirm which account you are on. "Signed in" and "not
signed in" look almost identical.

And the words are wrong. The controls talk about passkeys and enrolment, which describes the
mechanism rather than the act. People know what logging in and out means; they should not
have to learn this game's vocabulary to keep their progress.

## What Changes

- Require a username when registering, and require it to be unique.
- Show the username wherever the account state is shown, so being signed in is visible at a
  glance rather than inferred.
- Rename the controls to **Log in**, **Register** and **Log out**.
- Reject a username that is already taken, at the moment it is typed rather than after the
  passkey ceremony.

## Capabilities

**Modified Capabilities**:

- `player-identity` — registration gains a required unique username, signing in reports who
  you are, and the account state becomes something the interface states rather than implies.

## Impact

- Adds a username to the player record and a uniqueness constraint enforced by the database
  rather than by a check-then-write, which would race.
- Adds an endpoint to test availability, so the name is validated before the device prompts
  for a passkey.
- Changes the words in the account panel and adds the signed-in state to the header.
- Existing accounts have no username. They keep working; the game asks for one the next time
  the panel is opened rather than locking anything.

## Decisions

- **Still no password and no email.** A username names the account; the passkey proves it is
  yours. Nothing here reintroduces a secret to remember or a contact detail to hand over.
- **Logging in still needs no typing.** Credentials stay discoverable, so the browser offers
  the right passkey and the account is resolved from it. The username is what the account is
  *called*, not what you have to produce to get in — asking for both would be friction for
  nothing.
- **Uniqueness is case-insensitive.** Two accounts differing only in capitalisation would be
  indistinguishable everywhere they are shown, which defeats the point of naming them.
