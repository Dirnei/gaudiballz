# Design

## Context

Both solved overlays (`GameScreen.tsx`, `DailyScreen.tsx`) already show stars, moves, par,
elapsed time and time target. The campaign overlay also knows the level id and `levelCode`,
and the daily knows its date (`formatDailyDate`). A clipboard helper with a `textarea` fallback
(`copyText`) exists but is private to `GameScreen.tsx`, where it copies level codes.

On the server, completions are scored in `ProgressionSlice` and `DailySlice`, but only bests
are kept (progress, `daily_results`, `level_leaderboard`), never the individual attempt.

## Goals / Non-Goals

**Goals:**
- One builder that produces the same result text for campaign levels and the daily, differing
  only in the title line.
- A result page whose numbers can be trusted, because they are the ones the server scored.

**Non-Goals:**
- A share image, or Open Graph tags that render a preview card in chat apps. That would need
  server-rendered HTML per result, and can follow separately.
- Deleting results, or letting a player hide their name on an old link.
- Any server-side share tracking. The product has no telemetry beyond the player's own stats.

## Decisions

**A pure text builder.** `buildShareText({ title, stars, moves, par, elapsedMs, timeTargetMs,
hintsUsed, url }, t)` in `client/src/game/shareResult.ts` builds the score line and joins
title, score and link. Each screen builds its own title from an i18n template
(`game.shareTitle` with the level, `daily.shareTitle` with the date) and its own link. Unit
tests pin the exact output from both spec scenarios.

**Copy only, no share sheet.** The player asked for plain text to paste wherever they like.
The system share sheet (`navigator.share`) picks the target app for them and behaves
differently on every platform, so Share always copies with `copyText` and shows a 2-second
"Copied!" state on the button, like the level-code badge does. `copyText` moves to
`client/src/game/clipboard.ts` so both screens use it.
- *Alternative*: share sheet on phones, copy on desktop. Rejected at the player's request.

**Share the attempt just solved, not the best.** The overlay shows the attempt just solved.
Sharing numbers that differ from the ones on screen would be confusing.

**No level code in the text.** The link's result page has a Play button that unlocks the level
with its code, so the code in the text would only repeat what the link already does.

**The server records the result at completion time and returns its id.** Both completion
endpoints (`POST /api/v1/progress/completions` and `POST /api/v1/daily/completions`) insert a
`SharedResultDocument` into a new `shared_results` collection and return `shareId`. The link is
`<origin>/r/<shareId>`.
- *Alternative*: a separate `POST /api/v1/shares` the client calls when Share is pressed.
  Rejected: the endpoint would have to find "the attempt just solved" again, but the server only
  keeps bests (progress, daily results, leaderboards). It would also either trust numbers from
  the client, which lets anyone forge a score, or need a lookup key per attempt anyway. Recording
  at completion stores exactly what was scored, and Share needs no network round trip.
- *Cost*: one small document per scored completion, about the same as the completion journal
  already writes. Accepted.

**The id is 8 random base62 characters** from `RandomNumberGenerator`, about 47 bits, so ids
can't be enumerated. It is used as the Mongo `_id`; a duplicate-key error (practically never)
retries with a new id.

**The document stores numbers, not presentation.** `{ Id, Kind: "level"|"daily", Level?, Date?,
PlayerId, Moves, Hints, Stars, ElapsedTimeMs, Par, TimeTargetMs, CreatedAt }`. The username and
ball are looked up when the page is viewed (the spec wants the current name), and the board is
regenerated from the level id or date. Both are deterministic, so nothing about the board is
stored.

**`GET /api/v1/shares/{id}` is public and returns everything the page needs in one call:** the
stored numbers, the level code, `player: { username, ball } | null`, `board: { tubes, capacity }`,
`rank: { position, total }`, and for dailies `isToday`. The rank uses two `CountDocuments` queries
against `level_leaderboard` (period `null`) or `daily_results` (date, username not null), with the
same three-tier "better" filter as `GetLevelPlayerRankAsync`/`GetDailyPlayerRankAsync` and the
sharer's own entry excluded with `PlayerId != sharer`. It is not output-cached, because rank and
username change.

**No actor.** A shared result is written once and never changes. There is no per-entity state,
no ordering and no concurrency to coordinate, so a plain `PuzzleStore` method is right. An actor
would only add a hop.

**Result page (`/r/:id`).** It uses `PageLayout` like the other site pages. The board preview is a
small static `BoardPreview` (tubes styled with `TUBE_STYLE` and `ballStyle`, no buttons or
animation) rather than the interactive `Tube`, which carries tap, drag and focus behaviour a
picture doesn't need. Play for a level calls the existing `unlockWithCode(code)` from the game
context and navigates to `/play`. For a daily it navigates to `/daily`.

**Stars as `⭐` for earned and `☆` for unearned.** A filled/empty pair keeps the row three
symbols wide, so results line up when several are pasted into the same chat.

Determinism: the preview regenerates the board from the level id or date with the existing
seeded generators (`LevelCatalogue.Build`, `DailyChallenge.BoardForDate`), so it is the board
the result was played on, as long as the generator version is unchanged.

## Risks / Trade-offs

- [Emoji render differently across platforms] → only the widely supported ⭐ ☆ ⏱ 💡 are used.
- [Clipboard write is blocked in some embedded webviews] → the existing `textarea` fallback
  covers it.
- [A shared code lets a friend skip ahead in the campaign] → accepted. That is already true of
  the code shown on every level, and skipping ahead is the whole point of codes.
- [A future generator version changes a level's board, so old previews show the new board] →
  the stored par and time target stay correct. A board mismatch on very old links is acceptable
  and can be fixed by storing the generator version if it ever happens.
- [A completion that reached the server only through the offline queue has no share button]
  → the button needs a server-scored result anyway. The link works once the result is recorded.
