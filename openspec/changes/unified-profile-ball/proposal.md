## Why

A player's chosen profile ball only appears in the account panel. The leaderboard, activity feed, and daily leaderboard each use a private hash-derived colour from a divergent 8-colour gradient palette, so a player who chose red might appear as blue on the leaderboard and green in the feed. Other players never see anyone's real chosen ball. The profile ball picker feels pointless when the choice is invisible everywhere it matters.

## What Changes

- The server stores the player's current profile ball alongside their name in leaderboard entries, activity feed events, and daily results.
- API responses for leaderboard, activity feed, and daily leaderboard include a `ball` field per entry.
- Client components render the actual profile ball (or the canonical `colourForName` fallback when none is chosen) using the existing `ballStyle` renderer from `skins`, replacing the three duplicate `ballColor` hash functions.
- When a player changes their profile ball, their leaderboard entries are updated to reflect the new choice.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `profile-ball`: The chosen ball is propagated to leaderboard, activity feed, and daily results so it is visible to other players.
- `global-leaderboard`: Leaderboard entries include the player's profile ball colour.
- `activity-feed`: Activity feed events include the player's profile ball colour.
- `daily-challenge`: Daily leaderboard entries include the player's profile ball colour.

## Impact

- **Server**: `LeaderboardDocument`, `ActivityFeedDocument`, and `DailyResultDocument` gain a nullable `ProfileBall` field. The upsert methods that write these documents pass the player's current ball. `PUT /api/v1/players/me/ball` updates leaderboard entries when the ball changes. API response shapes gain a `ball` field.
- **Client**: `LeaderboardPage.tsx`, `ActivityFeed.tsx`, and `DailyLeaderboard.tsx` drop their local `BALL_COLORS`/`ballColor` functions and render using the canonical `ballStyle`/`ballForAccount` from `skins` and `profileBall.ts`.
- **No migration needed**: Existing documents without a `ProfileBall` field read as null, which falls back to the name-derived colour — the same behaviour as before for legacy entries.
