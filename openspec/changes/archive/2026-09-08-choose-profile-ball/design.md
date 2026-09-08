## Context

See proposal.md — Why.

Three facts about the existing code shape this design:

1. **The palette is ordered and a level takes a prefix of it.** `client/src/skins/index.ts`
   documents the thirteen colours "in the order levels introduce them", and
   `LevelCatalogue.ParametersFor(levelId)` returns a colour count that only ever rises with
   the level id. A level with N colours contains exactly colours 1..N. So "which colours has
   this player finished a level containing" reduces to a single number: the highest level
   they have completed. Nothing new needs recording.
2. **That curve lives only on the server**, in `LevelCatalogue`. The client is told a
   level's `colourCount` when it fetches that level, and knows nothing about the campaign
   shape otherwise.
3. **The avatar already exists** as `colourForName`, a hash of the username across the ten
   vivid colours. It is the fallback this change keeps, not something being replaced.

Constraint from the repository conventions: the TypeScript and C# rules engines must agree
exactly, kept in step by conformance fixtures. None of this change touches rule behaviour —
which is itself a design goal, not an accident (see Non-Goals).

## Goals / Non-Goals

**Goals:**

- Derive availability from data the system already keeps, adding one field to storage and no
  new bookkeeping.
- Keep the campaign's colour curve in exactly one place. The client must not learn to
  compute which level introduces which colour.
- Enforce the gate on the server, so the dimming in the picker is a courtesy rather than the
  mechanism.
- Leave every existing account looking identical until its owner chooses otherwise.

**Non-Goals:**

- No second visual skin, no ball shapes, no patterns beyond the swirls the palette already
  carries. This picks a colour from the existing thirteen.
- No change to level generation, rule behaviour, or the conformance fixtures.
- No offline editing of the choice. It is account state and needs the server; the game
  itself remains fully playable offline.
- No leaderboard, profile page, or anything else that shows one player's ball to another.
  The ball is shown to its owner.

## Decisions

### The unlock table is served, not duplicated

A new endpoint returns, for each colour, the earliest level containing it:

```
GET /api/v1/profile/balls  →  [ { colour: 1, unlocksAtLevel: 1 }, … , { colour: 13, unlocksAtLevel: 151 } ]
```

The table is computed once at startup by walking level ids upward and recording the first id
at which `ParametersFor(id).Colours` reaches each colour, stopping when every colour has an
entry (with a hard cap on the walk so a future curve change cannot spin). It is identical for
every player and never changes for a given build, so it is cached at the edge for a year the
way `GET /api/v1/levels/{id}` already is.

The client then computes availability itself as `unlocksAtLevel <= highestCompleted`, using
the `highestCompleted` it already loads from `/api/v1/progress/`. No new per-player request.

*Alternative rejected:* returning an `unlockedColours` array inside `/players/me`. It makes
the response per-player and therefore uncacheable, and it still would not give the client the
"Level 26" hint text for the locked ones — so the table would be needed anyway.

*Alternative rejected:* porting the colour curve to TypeScript. It would create a second
implementation of a rule that must agree with the first, which is precisely the problem the
conformance fixtures exist to contain — and this one would have no fixtures behind it. The
curve is a campaign design decision, not a rule; it belongs in one place.

### The choice is one nullable field on the player

`PlayerDocument` gains `ProfileBall: int?`. Null means "never chosen", which is what makes
existing accounts unchanged by deployment: absent field, name-derived colour, same as today.
Clearing the choice writes null rather than writing the derived value, so an account that
resets to the derived colour keeps following its username if that username ever changes.

`GET /api/v1/players/me` returns it as `ball`. `Identity` on the client carries it.

*Alternative rejected:* a separate profile collection. One nullable integer does not earn a
collection, and it would add a read to the `/me` path that every launch goes through.

### The write goes through the store, not the session actor

`PUT /api/v1/players/me/ball` with `{ "colour": 7 }` or `{ "colour": null }`. It reads the
player's progress through the existing player registry actor — that ask is how progress is
read everywhere and is where per-player serialisation belongs — then validates and writes the
field with a direct store update.

**The actor does not earn its place for this write.** The session actor exists because two
devices submitting completions at once must not lose one another's work, and that is a real
merge. Choosing a ball is one player, on one screen, setting one field; last write wins is
the correct semantic, and routing it through an actor would buy serialisation nobody needs
and add a message type to maintain. Said plainly rather than adopted by habit.

Validation, in order: no token → 401; colour outside 1..13 → 400; colour whose
`unlocksAtLevel` exceeds the player's highest completed level → 403. Null is always accepted.

### A new slice, matching the capability

`ProfileBallSlice` with `Name => "profile-ball"`, mapping `/api/v1/profile/balls` and
`/api/v1/players/me/ball`. The codebase already maps one slice per capability
(`levels`, `player-identity`, `level-progression`); a capability without a slice would be the
odd one out. It shares the bearer-token extraction the other slices use.

### Locked balls are dimmed, not greyed

The dim treatment is built from the same `ballStyle` with reduced opacity and partial
desaturation, so a locked ball is recognisably the *same object* seen through a shadow —
which is what makes the set read as a collection. Full greyscale would make eleven of the
thirteen identical and destroy the sense of what is ahead.

The swirled pale colours (yellow, light blue, light green, white) keep their swirls when
dimmed. Those swirls are how someone who cannot separate the hues tells them apart, and that
need does not go away because the ball is locked.

### Every ball is named in text

The picker labels each colour with its name — the names already documented in the palette
comment — as the accessible name of its control, and the locked ones read as e.g.
"Magenta — unlocks at level 91". The palette was tuned for colour-blind separability, and a
picker that identified its options by colour alone would undo that work at the one screen
where the player is choosing *between colours specifically*. This is also what makes the
"a hint when unlocked" requirement work without a hover state on touch.

### The derived fallback stays vivid; a deliberate choice need not

`colourForName` keeps skipping black, white and grey, because a derived neutral reads as "no
account". A player who *picks* white gets white: they chose it, so it says something about
them rather than looking like an absence. The two rules differ on purpose.

## Risks / Trade-offs

- **A registered player who has completed nothing sees thirteen locked balls.** Registration
  requires no completion, so this is reachable on a brand-new account. → The panel states
  what earns the first ones ("Finish level 1"), so the screen explains itself rather than
  looking broken. Completing level 1 immediately earns three.

- **The palette length is asserted in two places.** The server decides the colour range from
  the campaign curve; the client renders `PALETTE[colour]`. A server that grew a fourteenth
  colour before the client did would send a colour the client cannot draw. → The client
  ignores any colour outside its palette rather than rendering a fallback shade, and the
  table endpoint is the only thing that names colours, so the client never invents one.

- **Editing the choice needs a connection.** The rest of the game does not. → The picker is
  behind the account panel, which is already an online-only screen (registering and logging
  in both need the server). A failed save says so and leaves the previous ball in place; it
  is never queued, because unlike a completion there is nothing to lose by retrying later.

- **A player could pick the same colour as the tubes they are looking at.** The header ball
  sits above a board that may contain that exact colour. → Accepted. The header ball is 16px
  in a pill with a username next to it and is never mistaken for a playable piece; and a
  player who wants the red ball because they like red should get the red ball.

- **Availability is derived, not recorded, so a change to the campaign curve moves it.** If
  a future change made level 26 use five colours instead of six, a player who had chosen
  violet could hold a ball that is no longer available. → Accepted, and the spec's
  "availability SHALL NOT be lost" is honoured for the case that matters: an existing choice
  is never revoked by validation, which runs on write only. The curve is documented as not a
  free edit for the same reason.

## Migration Plan

Deployable in one step, in either order.

- **Storage**: `ProfileBall` is absent on every existing `PlayerDocument`, which reads as
  null, which is the current behaviour. Mapped with the existing explicit class-map style;
  `SetIgnoreIfNull` keeps the field off documents that never set it, consistent with how
  `Username` is handled. No migration script, no backfill, no index.
- **Rollback**: reverting the server leaves the field on the documents that acquired it,
  ignored by `SetIgnoreExtraElements`. Reverting the client returns every account to its
  derived colour without data loss. Neither direction loses progress.
