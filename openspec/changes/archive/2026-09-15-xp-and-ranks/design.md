## Context

See proposal.md for motivation. The existing system tracks per-level best results in `PlayerProgress` (an immutable dictionary of level → `LevelResult`) and computes total points as a sum of best points + bonus points. Scoring (`Scoring.Calculate`) assigns 100/250/500 points for 1/2/3 stars. Bonus points (replay 10, time-beat 40) are recorded in `PuzzleStore.RecordCompletionBonusAsync`. Achievements are evaluated in `AchievementCatalogue` and delivered via `PlayerSessionActor`. The profile ball system already renders a coloured ball derived from the player's chosen or username-derived colour.

## Goals / Non-Goals

**Goals:**
- XP is the single visible currency (rename, not a new value) with additional bonus sources
- Rank is always derivable from XP — no persisted rank, no migration
- Badge shelf unifies existing achievements with new milestone/mastery badges
- All existing players see their rank immediately on first load after deploy

**Non-Goals:**
- Seasonal resets or rank decay
- Purchasable XP boosts (contradicts the no-monetization stance)
- Changing the rules engine or conformance fixtures
- Multiplayer rank matching
- Animated ball effects or particle systems for tier rings (keep it CSS-only)

## Decisions

### 1. Rank as a pure function, not persisted state

**Decision**: `RankTier.FromXp(long xp)` returns `(Tier, SubLevel)` from a static threshold table. No rank field in MongoDB.

**Why**: XP already exists as `TotalPoints` on `PlayerProgress`. Deriving rank avoids a migration, prevents rank/XP desync, and means rank is immediately available for all existing players. The threshold table is small enough to be a static array.

**Alternative considered**: Persisting rank in MongoDB for query efficiency (e.g., "all Diamond players"). Rejected because the leaderboard already sorts by points/XP, and filtering by rank is not a current requirement. If needed later, a computed field can be added without schema changes.

### 2. New bonuses in the persistence layer, not in Scoring

**Decision**: The no-hint, first-clear, and streak-day bonuses are recorded as bonus XP in `PuzzleStore` alongside the existing replay and time-beat bonuses, not in `Scoring.Calculate`.

**Why**: `Scoring.Calculate` is a pure function in `GaudiBallz.Rules` (no I/O, no player history). The new bonuses depend on player state (is this the first clear? what's the streak?), so they belong in the server's persistence layer where that state is available. This keeps the Rules library pure and avoids a conformance concern.

**Alternative considered**: Extending `Scoring.Calculate` with optional context parameters. Rejected because it would pull player-history concerns into the domain library and complicate conformance.

### 3. Badge catalogue extends achievement evaluation, not a separate system

**Decision**: Star milestones and colour mastery badges are new entries in a `BadgeCatalogue` that follows the same evaluation pattern as `AchievementCatalogue` — evaluated server-side on each completion, delivered in the completion response, persisted per-player.

**Why**: The infrastructure for evaluate-on-completion, persist-once, deliver-in-response already exists for achievements. Badges are the same shape (a condition checked against progress, awarded once, never revoked). Reusing the pattern avoids a second notification/persistence path.

**Alternative considered**: A fully separate badge system with its own actor and persistence. Rejected as unnecessary duplication — badges and achievements share the same lifecycle.

### 4. Rank ring as CSS, not SVG modification

**Decision**: The rank ring is a CSS border or box-shadow on the profile ball container, coloured by tier. No changes to the ball's SVG rendering.

**Why**: The profile ball is already a styled element. A CSS ring is trivial to add, theme-aware, and doesn't require SVG path knowledge. It also makes the ring consistent regardless of which ball colour the player has chosen.

**Alternative considered**: Drawing the ring as an SVG circle around the ball. Rejected because it complicates the existing ball rendering and adds no visual benefit.

### 5. Rank-up delivered in completion response, not pushed

**Decision**: Rank-up events are computed by comparing pre- and post-completion XP against the threshold table, included in the completion response the client already receives.

**Why**: The client already processes the completion response to show stars, points, and achievements. Adding rank-up events to the same response means no new server-push infrastructure, no new WebSocket channels, no race conditions. The Akka actor that handles completions already has the player's progress to compute both old and new rank.

**No Akka justification**: The `PlayerSessionActor` already serialises completion processing per player. Rank-up computation is a side-effect of the existing completion flow, not a reason for a new actor.

### 6. Replay-per-day tracking

**Decision**: Track replay bonus grants in a per-player, per-level, per-day structure in MongoDB (or as a dated set on the existing completion record). A replay bonus request checks whether one was already granted for that level on the current UTC date.

**Why**: The existing replay bonus has no daily cap. Adding one requires knowing "did this player replay this level today?" which needs a lightweight record. A dated set (level + UTC date) on the player's document is sufficient and avoids a new collection.

**Alternative considered**: Client-side tracking with localStorage. Rejected because it's trivially bypassable and wouldn't sync across devices.

## Risks / Trade-offs

**[XP inflation for existing players]** → Existing players with high total points will start at high ranks immediately. This is intentional — they earned those points — but early Diamond players may feel the rank is less meaningful. Mitigation: the threshold table is tuned for the game's actual economy (50k+/day is achievable), and can be adjusted if early data shows the distribution is wrong.

**[Threshold tuning]** → The tier thresholds are educated guesses. If too many players cluster in one tier or the top tier is unreachable, the table needs adjusting. Mitigation: thresholds are a static table, trivially changeable without migration. Existing ranks only go up if thresholds are lowered.

**[Badge shelf scope creep]** → The badge shelf combines three sources (achievements, star milestones, colour mastery). If more badge types are added later, the shelf UI could become cluttered. Mitigation: categories keep things organized, and adding a new category is an additive change.

**[Points→XP rename breadth]** → "points" appears in many places (API responses, client components, translations). The rename is cosmetic but wide. Mitigation: it's a search-and-replace on display strings and i18n keys, not a data model change. The underlying field names can stay as `points` in code — only user-facing labels change.
