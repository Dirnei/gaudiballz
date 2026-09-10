## Why

Post-level-50 progression feels flat. The only visible progress marker is the campaign level number, and with no new unlocks, rank milestones, or reward moments, experienced players lose the sense of advancing. Rebranding total points as XP, layering a tiered rank system on top, and adding a badge shelf gives every session a payoff — frequent rank-ups for session satisfaction, plus rare mastery badges for long-term goals.

## What Changes

- Rebrand "total points" → "XP" across all UI surfaces (solved overlay, progress tiles, stats page, leaderboard).
- Add new XP bonus sources: no-hint bonus (50 XP), first-clear bonus (75 XP), streak-day bonus (25 XP). Cap replay bonus to once per level per day.
- Introduce tiered player ranks (Bronze → Silver → Gold → Platinum → Diamond) with sub-levels, derived purely from cumulative XP via a threshold table.
- Show a rank-coloured ring around the profile ball everywhere it appears.
- Display rank-up moments on the solved overlay (sub-level ups are subtle, tier promotions are prominent).
- Add a badge shelf to the stats/profile page combining star-collection milestones, colour-mastery badges, and existing achievements.
- Add rank badge and ring to leaderboard entries and activity feed.
- Replace the level-progress bar on the stats page with rank progress (tier + sub-level + XP bar to next).

## Capabilities

### New Capabilities
- `player-ranks`: Tiered rank system (Bronze–Diamond) computed from cumulative XP, rank ring visual, rank-up events on completion.
- `badge-shelf`: Unified badge display combining star milestones, colour mastery, and existing achievements on the stats/profile page.

### Modified Capabilities
- `level-scoring`: New XP bonus sources (no-hint, first-clear, streak-day), replay-per-day cap, points→XP rename.
- `player-stats-view`: Level progress replaced by rank progress, badge shelf section added, points→XP relabelling.
- `global-leaderboard`: Rank badge and ring shown alongside player entries, points→XP relabelling.
- `player-achievements`: Existing achievements displayed as badges in the badge shelf rather than only in the achievements panel.
- `main-menu`: Progress tiles updated — points→XP, rank tile added with tier colour and sub-level progress.
- `profile-ball`: Rank-coloured ring rendered around the profile ball everywhere it appears.

## Impact

- **Server (C#)**: New `RankTier.FromXp()` pure function in Rules or Server. New bonus calculations in scoring/persistence layer. New badge catalogue entries for star milestones and colour mastery. Completion response extended with rank-up events. Progress/stats API responses extended with rank info.
- **Client (TypeScript/React)**: Points→XP rename across all components. New rank display components (ring, badge, progress bar). Rank-up animation on solved overlay. Badge shelf component on stats page. Updated progress tiles.
- **Persistence**: No MongoDB schema migration — XP is the existing total points, rank is computed. New badge types evaluated from existing progress data.
- **Conformance**: Not affected — rule engine behaviour is unchanged; XP/ranks are a presentation and progression concern.
