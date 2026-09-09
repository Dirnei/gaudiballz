## Why

Players complete levels in isolation with no awareness of the wider community. Adding a lightweight gaming hub — leaderboard, live community stats, and a personal stats view — gives returning players social context and competitive motivation without introducing multiplayer or monetization.

## What Changes

- Add a global **leaderboard** showing ranked players by total points, filterable by time period (all time, this week, today).
- Add **live community stats** visible on the home page: players currently online, puzzles solved today, and active players this week.
- Add a **player stats view** showing detailed personal statistics: total points, games played, win rate, highest level, best moves, current streak, level progress, and an achievements overview.
- Add a **live activity feed** on the home page showing recent notable actions by other players (level clears, records, achievements, rank changes).
- Redesign the **home page** to serve as the hub entry point: play button, community stats ribbon, progress tiles, recent games, and activity feed.
- Extend the **AppShell nav** to include navigation tabs for Home, Leaderboard, and Your Stats alongside the existing logo and account button.
- Add **Nunito** as the body typeface alongside the existing Fredoka display font.
- Add backend endpoints to serve leaderboard data, community stats, and the activity feed.

## Capabilities

### New Capabilities
- `global-leaderboard`: Ranked player list by total points with time-period filtering (all time, weekly, daily), podium display for top 3, and the viewer's own rank highlight.
- `community-stats`: Real-time aggregate statistics (players online, puzzles solved today, active players this week) served to the home page.
- `player-stats-view`: Detailed personal statistics page showing points, games, win rate, level progress, streak, best moves, and an achievements summary grid.
- `activity-feed`: Live feed of notable player actions (level clears, new records, achievements earned, rank changes) visible on the home page.

### Modified Capabilities
- `app-shell`: Nav header gains tabbed navigation (Home, Leaderboard, Your Stats) and the body font changes to Nunito.
- `main-menu`: Home page is redesigned as a hub with community stats, progress tiles, recent games, and activity feed; the play action and level-code entry remain.

## Impact

- **Frontend**: New routes (`/leaderboard`, `/stats`), redesigned home page, new components for leaderboard table/podium, stat cards, activity feed, progress tiles. Nunito font files added to `/public/fonts/`. AppShell header gains tab navigation.
- **Backend**: New API endpoints for leaderboard (ranked query over player totals), community stats (online count, daily solve count, weekly active count), activity feed (recent notable events), and player stats aggregation.
- **Data**: MongoDB needs indexes on player totals for leaderboard queries. An activity/events collection or capped collection for the feed. Online presence tracking (connection count or heartbeat).
- **Dependencies**: Nunito font (self-hosted woff2, no new npm packages).
