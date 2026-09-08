## Why

The game has progression (levels completed, best moves/hints) but no way for a registered
player to see what they have accomplished beyond a number. Achievements give returning
players goals beyond "finish the next level", reward different play styles (speed, no-hint,
streak), and make the account panel feel like it belongs to someone.

## What Changes

- A server-side achievement engine that evaluates completion events against a catalogue of
  achievement definitions and records which ones each player has earned.
- A new achievements API so the client can fetch what a player has unlocked.
- A client-side achievements display reachable from the account panel, showing earned and
  locked achievements with progress indicators where applicable.
- A toast notification when an achievement is newly earned on level completion.
- A daily-play tracking mechanism on the server to support streak and calendar-based
  achievements.

### Achievement catalogue (initial set)

**Milestone achievements** (cumulative level completions):
- First Steps — complete 1 level
- Getting Started — complete 5 levels
- Double Digits — complete 10 levels
- Halfway There — complete 25 levels
- Half Century — complete 50 levels
- Century — complete 100 levels
- Veteran — complete 150 levels

**Perfection achievements** (quality of play):
- Under Par — complete a level at or below par moves
- Flawless Ten — complete 10 levels without using any hints
- No Help Needed — complete 25 levels without using any hints
- Purist — complete 40 levels without using any hints or undos
- Speed Demon — complete 5 levels at or below par moves

**Streak achievements** (consecutive days with at least one completion):
- Two-Day Streak — play on 2 consecutive days
- Week Warrior — play on 7 consecutive days
- Fortnight — play on 14 consecutive days
- Monthly Dedication — play on 30 consecutive days

**Calendar achievements** (days within a week):
- Full Week — complete at least one level on every day of a calendar week (Mon–Sun)

**Exploration achievements** (breadth of play):
- Restart Resilience — restart a level and then complete it
- Hint Apprentice — use all 3 hints in a single level and still complete it
- Deep Diver — complete a level with 6+ colours
- Marathon — complete 10 levels in a single session (without closing the game)

## Capabilities

### New Capabilities
- `player-achievements`: Defines the achievement catalogue, how achievements are evaluated
  and awarded, how they are stored, how the client retrieves and displays them, and the
  toast notification on earn.

### Modified Capabilities
- `level-progression`: The completion recording flow gains a side-effect — after a
  completion is persisted, the achievement engine is consulted. No existing requirement
  changes; a new requirement is added for the event hook.

## Impact

- **Server**: New `Achievements` slice (following the existing `ISlice` pattern). New
  MongoDB collection for awarded achievements and daily-play tracking. The
  `PlayerSessionActor` completion flow gains a message to the achievement evaluator.
- **Client**: New `achievements.ts` module for fetching achievement state. New
  `AchievementsPanel` component reachable from the account panel. A toast component for
  newly earned achievements on the solved screen. New types and API calls.
- **API**: New `GET /api/v1/achievements` endpoint returning the player's achievement state.
  The existing `POST /api/v1/progress/completions` response gains an optional
  `newAchievements` array so the client knows what was just earned without a second round-trip.
- **Database**: New `achievements` collection (player id + achievement id, with timestamp).
  New `daily_play` collection or field tracking distinct play-days per player for streaks.
- **No breaking changes** to any existing API or behaviour.
