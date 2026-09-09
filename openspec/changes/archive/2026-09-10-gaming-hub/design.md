## Context

The game is a single-player puzzle with a React/Vite/Tailwind frontend and a .NET/Akka.NET/MongoDB backend. Players already have identity (anonymous or passkey-registered), scoring (1–3 stars, points), achievements, and level progression. The frontend uses Motion for animation, Fredoka for display type, and a glass-panel dark aesthetic with a bloom background. See proposal.md for motivation.

The backend already persists per-player completion records and achievement state. The hub adds read-heavy aggregate views over existing data, plus a new lightweight event stream.

## Goals / Non-Goals

**Goals:**
- Add leaderboard, community stats, player stats, and activity feed with minimal new infrastructure
- Reuse existing data (player totals, achievements, completions) rather than duplicating it
- Keep the visual language consistent with the existing glass-panel, bloom, Fredoka aesthetic
- Frontend changes are additive — existing game, levels, and code-entry flows remain untouched

**Non-Goals:**
- Real-time push updates (WebSocket/SignalR). All hub data is fetched on page load. Real-time can be layered on later.
- Multiplayer, lobbies, or any synchronous player interaction
- Social features beyond passive visibility (no friends, no messaging, no player profiles)
- Server-side rendering or SEO optimization for hub pages

## Decisions

### 1. Leaderboard: Materialized view vs. on-demand query

**Decision:** Use a materialized MongoDB collection (`leaderboard`) updated on each completion, rather than querying and sorting player records on every leaderboard request.

**Rationale:** The player collection will grow, and sorting by total points with pagination on every request is expensive. A materialized view lets reads be a simple indexed range scan.

**Alternative considered:** On-demand aggregation pipeline over the player collection. Rejected because it gets slower as the player base grows and adds latency to a page-load-critical request.

**Update trigger:** When a completion is confirmed and points change, the backend upserts the player's leaderboard entry. For weekly/daily views, separate documents are keyed by period (e.g., `{playerId, period: "2026-W37"}`).

### 2. Community stats: In-memory counters vs. database queries

**Decision:** Maintain online count as an in-memory counter on the server (incremented/decremented on connect/disconnect). Daily solve count and weekly active count are lightweight MongoDB queries with TTL-indexed documents, cached for 30–60 seconds.

**Rationale:** Online count changes constantly and must be fast. Solve counts are write-heavy but read-infrequent (only on home page load), so a short cache is sufficient.

**Alternative considered:** A dedicated stats collection updated atomically on every completion. Rejected as over-engineering for counters that tolerate staleness.

### 3. Activity feed: Capped collection

**Decision:** Use a MongoDB capped collection for activity feed events, with a fixed size that naturally expires old events (FIFO). The feed endpoint reads the last N documents in reverse insertion order.

**Rationale:** Capped collections are insertion-ordered, automatically size-bounded, and efficient for tailable reads. No TTL indexes or cleanup jobs needed.

**Alternative considered:** A regular collection with a TTL index. Works but requires index overhead and periodic cleanup. Capped collection is a better fit for an append-only, bounded feed.

### 4. Player stats: Aggregation endpoint

**Decision:** A single `/api/player/stats` endpoint that aggregates the player's data from existing collections (completions, achievements, streaks) and computes derived values (win rate, rank, contextual comparisons) server-side.

**Rationale:** Keeps the client simple — one fetch, one render. The aggregation is per-player and fast. Contextual comparisons (percentile, rank delta) are computed from the leaderboard materialized view.

### 5. Frontend routing and components

**Decision:** Add two new routes (`/leaderboard`, `/stats`) to the existing react-router-dom setup. Both render inside the AppShell. The home page (`/`) keeps its route but gets new sections. Each hub feature is a self-contained component.

New component tree:
- `StatsRibbon` — community stats chips (used on home page)
- `ProgressTiles` — player progress grid (used on home page)
- `RecentGames` — recent game results list (used on home page)
- `ActivityFeed` — live activity entries (used on home page)
- `LeaderboardPage` — podium + table, period tabs
- `StatsPage` — stat cards, level progress, achievements grid

### 6. Typography: Nunito as body font

**Decision:** Self-host Nunito woff2 files in `/public/fonts/` alongside the existing Fredoka files. Add `@font-face` declarations to `index.css`. Nunito is the default body font; Fredoka remains for headings and display elements.

**Alternative considered:** Using the existing system font stack for body. Rejected because Nunito pairs naturally with Fredoka (same rounded family) and elevates the hub's readability at body sizes.

### 7. Online presence: Heartbeat-based

**Decision:** The client sends a periodic heartbeat (every 60 seconds) to a lightweight endpoint. The server maintains an in-memory set of active player IDs with a TTL. On each heartbeat, the TTL is refreshed. Players who stop heartbeating drop off after the TTL expires (~90 seconds).

**Alternative considered:** WebSocket connections for presence. Rejected as it adds infrastructure complexity (SignalR hub, connection management) for a counter that tolerates 60-second staleness.

## Risks / Trade-offs

- **[Leaderboard write amplification]** → Every completion triggers a leaderboard upsert. At current scale this is negligible; if completions grow, the upsert can be debounced or batched.
- **[Stale community stats]** → Stats are cached and can be up to 60 seconds old. Acceptable for a casual game — exact real-time numbers are not needed.
- **[Capped collection size]** → If the feed collection is too small, events drop off too quickly. Size it for ~24 hours of events at expected volume; resize later if needed.
- **[Anonymous players excluded from leaderboard]** → Players who never register are invisible on the leaderboard. This is intentional (usernames are needed for display) but means the leaderboard undercounts total engagement. The community stats (which include anonymous players) compensate.
- **[New font download]** → Nunito adds ~50KB of font files to the initial load. Mitigated by `font-display: swap` and preloading the latin subset.
