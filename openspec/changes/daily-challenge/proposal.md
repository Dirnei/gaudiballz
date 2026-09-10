## Why

The campaign is a solo climb — every player works through the same sequence at their own pace, and there is nothing shared about a given day. A daily challenge gives everyone the same puzzle on the same day, creating a natural conversation point ("did you do today's?") and a reason to come back daily. It reinforces the streak mechanic that already exists in achievements, adds a competitive angle without changing the campaign, and costs nothing to generate because the level system is seed-based.

## What Changes

- A new puzzle is generated each day from a date-derived seed. All players see the same board on the same date.
- A dedicated daily challenge screen (immersive layout, like the regular game) with its own completion flow.
- Daily challenge results are scored with the existing star/point system but tracked separately from campaign progress — completing the daily does not advance the campaign ceiling or inflate campaign stats.
- A daily leaderboard showing the best results for today's puzzle, visible after the player has submitted at least one attempt.
- Players can replay the daily challenge for a better score. Best result per day is kept.
- The daily challenge is available to all players (anonymous and registered). The daily leaderboard is visible to all but only registered players appear on it.
- A "Daily Challenge" entry point on the main menu alongside Play and Level Select.
- The daily challenge resets at midnight UTC.
- A countdown or "come back tomorrow" message after solving, showing when the next challenge drops.
- Both English and German translations for all new UI strings (leveraging the i18n infrastructure).

## Capabilities

### New Capabilities
- `daily-challenge`: Daily puzzle generation, daily challenge gameplay, daily result tracking, and the daily leaderboard.

### Modified Capabilities
- `main-menu`: A daily challenge entry point is added to the main menu.
- `activity-feed`: Daily challenge completions appear in the activity feed as a distinct event kind.

## Impact

- **Server**: New endpoint to get today's daily challenge board (date-derived seed + fixed mid-range difficulty). New endpoint to record daily completions (separate from campaign). New endpoint for the daily leaderboard. New MongoDB collection or document structure for daily results.
- **Client**: New `DailyScreen` component under immersive layout. New route `/daily`. Main menu gains a daily challenge button. New i18n keys for daily challenge UI in both `en.json` and `de.json`.
- **Existing features**: No changes to campaign progression, campaign scoring, or campaign leaderboard. The daily challenge is fully additive.
- **Level generation**: Uses `LevelGenerator.Generate` directly with a date-derived seed, bypassing `LevelCatalogue` (which is campaign-specific).
