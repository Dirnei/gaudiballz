## Why

The achievements section on the Stats page shows only achievement names and earned/locked icons — no descriptions explaining how to earn each one, and no progress indicators for threshold-based achievements. Players have to navigate to the separate Achievements page to see that information. This makes the Stats page feel incomplete and forces unnecessary navigation.

## What Changes

- Enhance the achievements section on the Stats page to show each achievement's description text (e.g. "Complete 10 levels").
- Show a progress indicator for threshold-based achievements that haven't been earned yet (e.g. "3 / 10").
- The existing `AchievementsSection` component already renders descriptions and progress bars in a compact format — reuse it on the Stats page instead of the current flat chip list.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities
- `player-stats-view`: The achievements summary requirement changes to include descriptions and progress indicators alongside each achievement's name and earned/locked state.

## Impact

- **Code**: `StatsPage.tsx` — replace the flat achievement chip list with the existing `AchievementsSection` component (or equivalent rendering that includes descriptions and progress).
- **Dependencies**: None — all data (descriptions, threshold, progress) is already returned by the achievements API.
- **APIs / Systems**: No backend changes. The API already serves `description`, `threshold`, and `progress` fields.
