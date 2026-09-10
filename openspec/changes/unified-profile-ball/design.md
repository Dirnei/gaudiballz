## Context

The profile ball is stored on `PlayerDocument.ProfileBall` (nullable int). The account panel renders it correctly via `ballForAccount(identity.ball, username)` → `ballStyle(colour)`. But `LeaderboardDocument`, `ActivityFeedDocument`, and `DailyResultDocument` don't store it, so the leaderboard, feed, and daily leaderboard each use a local `ballColor(name)` function with a divergent 8-gradient palette. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Every place a player's name is shown renders the same ball colour — their chosen one, or the canonical name-derived fallback.
- A single rendering path: `ballForAccount` + `ballStyle` from the `skins` module, everywhere.
- The three duplicate `BALL_COLORS`/`ballColor` functions are deleted.

**Non-Goals:**
- Migrating existing documents in MongoDB (null reads as "no choice", same as before).
- Showing the 3D ball sphere in the leaderboard/feed (a flat coloured dot is fine — only the colour must be correct).

## Decisions

### 1. Store `ProfileBall` on denormalized documents

**Choice:** Add `int? ProfileBall` to `LeaderboardDocument`, `ActivityFeedDocument`, and `DailyResultDocument`. Write it alongside `Username` whenever these documents are created or upserted.

**Why not look up the ball at read time?** The feed and leaderboard return lists of players. Looking up each player's ball would be N+1 queries. Denormalizing is the existing pattern — `Username` is already denormalized the same way.

### 2. Update leaderboard entries when ball changes

**Choice:** When `PUT /api/v1/players/me/ball` is called, update the `ProfileBall` field on all leaderboard documents for that player (all-time + period entries). This is a simple `UpdateMany` by `PlayerId`.

**Why not leave leaderboard entries stale?** The username is already kept in sync. The ball should follow the same pattern. A player who changes their ball expects to see it everywhere immediately.

**Activity feed and daily results are not updated retroactively** — feed events expire naturally, and daily results are per-day. The next event/daily will carry the current ball.

### 3. API response shapes

Add `ball: number | null` to:
- Leaderboard entries (`GET /api/hub/leaderboard`)
- Activity feed events (`GET /api/hub/activity-feed`)
- Daily leaderboard entries (`GET /api/v1/daily/leaderboard`)

### 4. Client rendering: coloured dot with correct colour

**Choice:** Replace the `ballColor(name)` calls with `ballForAccount(entry.ball, entry.username)` from `profileBall.ts`, then apply the colour using a simple `background: PALETTE[colour].gradient` CSS. Keep the small dot rendering (not the full 3D `ballStyle` sphere).

**Why not full 3D spheres?** The leaderboard and feed use 14px dots. A full `ballStyle` sphere with specular highlights would be overkill and visually noisy at that size. The dot just needs the correct colour.

**Alternative:** Extract a `ballDotStyle(colour)` helper from skins that returns the gradient for a flat dot. This replaces the three duplicated functions with one canonical source.

### 5. No Akka involvement

All changes are to denormalized MongoDB documents and API response shapes. No actor state changes.

## Risks / Trade-offs

- **Stale ball on old feed entries:** If a player changes their ball, already-recorded activity feed events still carry the old ball until they expire. Acceptable — the feed is short-lived.
- **Stale ball on old daily results:** Past daily results keep the ball from the day they were recorded. Acceptable — daily results are date-scoped.
