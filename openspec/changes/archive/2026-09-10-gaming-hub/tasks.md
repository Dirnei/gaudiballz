## 1. Typography & Font Setup

- [x] 1.1 Download Nunito woff2 files (latin, latin-ext, weights 400/600/700) and add to `client/public/fonts/`
- [x] 1.2 Add `@font-face` declarations for Nunito in `client/src/index.css` alongside existing Fredoka declarations
- [x] 1.3 Update base body font-family to Nunito; keep Fredoka on headings and display elements via Tailwind or explicit style

## 2. Backend: Data Layer

- [x] 2.1 Create `Leaderboard` MongoDB collection with documents `{playerId, username, totalPoints, gamesPlayed, gamesWon, updatedAt}` and descending index on `totalPoints`
- [x] 2.2 Create periodic leaderboard documents for weekly/daily views keyed by `{playerId, period}` with descending index on `points`
- [x] 2.3 Create capped MongoDB collection `ActivityFeed` sized for ~24 hours of events, documents `{playerId, username, eventType, detail, timestamp}`
- [x] 2.4 Add leaderboard upsert logic to the completion flow: when a completion confirms and points change, upsert the player's all-time and current-period leaderboard entries
- [x] 2.5 Add activity feed event recording to the completion flow: on notable events (level clear, new record, achievement earned), insert into the capped collection

## 3. Backend: API Endpoints

- [x] 3.1 Add `GET /api/leaderboard?period={alltime|week|today}&offset=0&limit=20` — returns ranked player entries and the requester's own rank
- [x] 3.2 Add `GET /api/community-stats` — returns `{onlineCount, solvedToday, activeThisWeek}` with 30–60 second caching
- [x] 3.3 Add `GET /api/player/stats` (authenticated) — returns aggregated player stats: totalPoints, gamesPlayed, gamesWon, winRate, highestLevel, bestMoves, currentStreak, bestStreak, globalRank, levelProgress, contextual comparisons
- [x] 3.4 Add `GET /api/activity-feed?limit=20` — returns recent notable events from the capped collection
- [x] 3.5 Add `POST /api/heartbeat` — registers/refreshes the player's online presence; server maintains in-memory TTL set and exposes count via community-stats endpoint

## 4. Backend: Online Presence

- [x] 4.1 Implement in-memory presence tracker: concurrent dictionary of `{playerId → lastSeen}` with 90-second TTL eviction
- [x] 4.2 Wire heartbeat endpoint to presence tracker
- [x] 4.3 Expose online count from presence tracker in the community-stats response

## 5. Frontend: AppShell Navigation

- [x] 5.1 Add navigation tabs (Home, Leaderboard, Your Stats) to the AppShell header, using react-router-dom NavLink with active styling
- [x] 5.2 Add `/leaderboard` and `/stats` routes to App.tsx inside the AppShell layout
- [x] 5.3 Hide wordmark on viewports narrower than 640px; keep logo and tabs visible

## 6. Frontend: Home Page Redesign

- [x] 6.1 Create `StatsRibbon` component — fetches `/api/community-stats` on mount, displays 3 chips (online, solved today, active this week)
- [x] 6.2 Create `ProgressTiles` component — displays total points, current level, streak, and rank in a responsive grid of glass-panel tiles; hide rank tile for anonymous players
- [x] 6.3 Create `RecentGames` component — displays recent game results (outcome badge, level, difficulty, moves, time ago, points) in a glass-panel list; fetches from existing completion data
- [x] 6.4 Create `ActivityFeed` component — fetches `/api/activity-feed`, displays entries with player ball dot, action text, and relative timestamp
- [x] 6.5 Integrate all four components into the redesigned MainMenu: hero (logo, wordmark, tagline, play button) → stats ribbon → progress tiles → two-column layout (recent games + activity feed)
- [x] 6.6 Implement client-side heartbeat: send `POST /api/heartbeat` every 60 seconds while the app is open, stop on unmount

## 7. Frontend: Leaderboard Page

- [x] 7.1 Create `LeaderboardPage` component with period tabs (All Time, This Week, Today)
- [x] 7.2 Implement podium section — top 3 players displayed with avatar, rank, name, score, win rate
- [x] 7.3 Implement ranked table — rows 4+ with rank, player name (with ball dot), points, games played, win-rate bar
- [x] 7.4 Highlight the viewer's own row with a violet border; show their rank separately if outside the visible range
- [x] 7.5 Add pagination — load more entries on scroll or button click

## 8. Frontend: Player Stats Page

- [x] 8.1 Create `StatsPage` component — fetches `/api/player/stats` on mount
- [x] 8.2 Implement stat cards grid — 6 cards (points, games, highest level, best moves, streak, rank) each with value, label, icon, and contextual comparison line
- [x] 8.3 Implement level progress bar — shows X of Y levels completed with percentage and a gradient fill bar
- [x] 8.4 Implement achievements summary grid — shows all achievements with earned/locked visual state, count header ("8 / 12 unlocked"), reusing achievement data from existing endpoint
- [x] 8.5 Handle anonymous player state — show registration prompt instead of stats

## 9. Testing & Verification

- [x] 9.1 Add backend tests for leaderboard upsert logic (points change triggers upsert, no-change skips)
- [x] 9.2 Add backend tests for community-stats endpoint (counts, caching, period reset)
- [x] 9.3 Add backend tests for activity feed (event recording, capped collection behaviour, privacy — no aggregate stats in entries)
- [x] 9.4 Add frontend component tests for StatsRibbon, ProgressTiles, RecentGames, ActivityFeed
- [x] 9.5 Add frontend tests for LeaderboardPage (period switching, own-rank highlight, pagination)
- [x] 9.6 Add frontend tests for StatsPage (stat rendering, anonymous redirect, achievements grid)
- [x] 9.7 Verify all hub pages at 375px, 768px, and 1440px viewports
- [x] 9.8 Verify text contrast ≥ 4.5:1 on all new surfaces in both themes
- [x] 9.9 Rebuild Docker image and verify hub pages on port 8123
