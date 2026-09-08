## Why

An account is already represented by a puzzle ball rather than a generic avatar, but the
colour is a hash of the username — the player has no say in it, and two people who both
wanted red get whatever the hash handed them. It is the one piece of the game that is
visibly *theirs* and it is the one piece they cannot touch.

There is also a reward here going unspent. The campaign introduces its thirteen colours one
at a time over a hundred and fifty levels, and each arrival is already announced on the
board ("A new colour joins — 6 to sort."). Letting a finished colour become a ball the
player can wear turns that announcement into something they keep, at no cost to a game that
deliberately sells nothing.

## What Changes

- **A player with an account can choose which ball represents them**, from the game's own
  thirteen colours, in the account panel where the other account controls already live.
- **The choice is gated by what the player has finished.** A colour is available once the
  player has completed a level that uses it. Because a level with N colours always uses the
  first N of the palette, this follows from the highest level completed and needs nothing
  new recorded.
- **Locked balls are shown, not hidden** — dimmed, and each says the level that earns it, so
  the set reads as a collection with a visible road ahead rather than as a short list.
- **The chosen ball lives on the account**, so it is the same on a phone and a PC, and it
  survives clearing the browser.
- **Choosing is optional.** With no choice made, the name-derived colour stays exactly as it
  is today, so no existing account changes appearance.
- **Nothing announces a new ball.** No dot, no badge, no toast when a colour unlocks — the
  same stance the product takes on account prompts. The board already says a new colour has
  joined; the picker is found when the player goes looking.
- **Anonymous players are unchanged**, keeping the dashed empty circle. A ball says which
  account you are on, and an anonymous player is not on one.

## Capabilities

### New Capabilities

- `profile-ball`: which ball represents a player's account, which balls they may choose
  from, how the rest are shown, and where the choice is kept.

### Modified Capabilities

None. The player-identity spec states that a logged-in player's username is visible and
that account controls are reachable at any time; it says nothing about the avatar, which
has been an implementation detail until now. Nothing it requires changes here.

## Impact

- **Server — level catalogue** (`src/Puzzle.Server/Levels/LevelCatalogue.cs`): the campaign's
  colour curve already lives here as `ParametersFor`; it gains a way to answer "the first
  level that uses colour N", so the client never has to reimplement the curve.
- **Server — players** (`src/Puzzle.Server/PlayerIdentity/PlayerIdentitySlice.cs`,
  `Persistence/Documents.cs`, `Persistence/PuzzleStore.cs`): `PlayerDocument` gains the
  chosen ball; `GET /api/v1/players/me` returns it, and a new endpoint sets it. Setting it
  is refused when the colour is not yet unlocked, so the gate is not only a client-side
  courtesy.
- **Client — identity** (`client/src/game/identity.ts`): `Identity` carries the chosen ball.
- **Client — skins** (`client/src/skins/index.ts`): `colourForName` stays as the fallback; a
  locked ball needs a dimmed treatment built from the same `ballStyle`.
- **Client — account panel** (`client/src/game/AccountPanel.tsx`): the picker, shown only to
  a logged-in player.
- **Client — header** (`client/src/game/App.tsx`): the header ball uses the chosen colour
  when there is one.
- **No rules-engine change.** This is presentation and account state; no board behaviour
  moves, so the conformance fixtures are untouched and the two engines stay in step by
  not being involved.
