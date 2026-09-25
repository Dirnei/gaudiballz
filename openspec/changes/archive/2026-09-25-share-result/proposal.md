# Proposal

## Why

Every level is the same board for everyone. A campaign level always produces the same board
from its id, and the daily is shared by everyone that day. That makes any result worth
comparing with friends, but right now the only way to pass one on is a screenshot. A short
text, like Wordle's, lets players compare scores. A link in that text to a page showing the
result brings new players in through a friend's message rather than through any signup push.

## What Changes

- The campaign win screen and the daily challenge solved overlay each get a **Share result**
  action.
- Share copies a short, spoiler-free text to the clipboard and briefly confirms "Copied", so the
  player can paste it wherever they like. It never opens a system share sheet.
- The text has a title line ("I played Gaudi Ballz / Level 3", or the daily date), the stars,
  moves against par, time against the target, hints used (only when there were any), and a
  link to that result's own page.
- The server keeps every result it scores under a short, unguessable id. A result link can only
  point at a result the server itself recorded, so a shared score can't be made up.
- A new **result page** (`/r/<id>`) that anyone can open without an account. It shows:
  - who solved it (username and profile ball for registered players, "A player" otherwise)
    and what they solved,
  - the stars, moves against par, time against the target, and hints,
  - a preview of the level's starting board,
  - where the result ranks on that level's or that day's leaderboard,
  - a button to play the same level (or today's daily, if the shared daily has ended).

## Capabilities

### New Capabilities

- `shared-result-page`: the stored result behind a share link, and the public page that
  shows it.

### Modified Capabilities

- `level-scoring`: adds a requirement for copying a campaign level result from the win screen.
- `daily-challenge`: adds a requirement for copying the daily result from the solved overlay.

## Impact

- Server: a new `Sharing` slice with `GET /api/v1/shares/{id}`, a `shared_results` MongoDB
  collection, and a `shareId` field on the campaign and daily completion responses.
- Client: a Share result button on both solved overlays, a pure share-text builder, the copy
  helper moved into a shared module, a new `/r/:id` route and result page, and new `en`/`de`
  strings.
- No change to scoring, the rules engine or conformance fixtures.
