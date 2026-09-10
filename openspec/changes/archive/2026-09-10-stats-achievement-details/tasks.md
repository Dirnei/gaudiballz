## 1. Update Stats Page Achievements Section

- [x] 1.1 Update `StatsPage.test.tsx` to assert that achievement descriptions and progress values are rendered (not just name chips)
- [x] 1.2 Replace the flat achievement chip list in `StatsPage.tsx` with the existing `AchievementsSection` component, passing the loaded achievements data
- [x] 1.3 Keep the "X / Y unlocked" summary count above the section

## 2. Verification

- [x] 2.1 Run client tests and confirm they pass
- [x] 2.2 Rebuild and restart Docker container, verify the Stats page shows descriptions and progress bars for achievements
