## 1. Rank Calculation (Server)

- [x] 1.1 Write tests for `RankTier.FromXp`: Bronze 1 at 0, sub-level boundaries at 8k increments, Silver entry at 80k, Gold at 480k, Platinum at 1M, Diamond at 1.6M, Diamond 5 cap at 2M+, mid-tier values
- [x] 1.2 Implement `RankTier.FromXp` pure function with the static threshold table returning tier + sub-level
- [x] 1.3 Write tests for rank-up detection: compare pre/post XP to detect sub-level up, tier promotion, and no-change cases
- [x] 1.4 Implement rank-up detection function that compares old and new XP and returns rank-up event (sub-level, tier, or none)

## 2. New XP Bonus Sources (Server)

- [x] 2.1 Write tests for no-hint bonus: 50 XP when hints=0, no bonus when hints>0
- [x] 2.2 Write tests for first-clear bonus: 75 XP on first completion of a level, 0 on replay
- [x] 2.3 Write tests for streak-day bonus: 25 XP when extending/starting a streak, 0 on second completion same UTC day
- [x] 2.4 Write tests for replay-per-day cap: replay bonus awarded once per level per UTC day, denied on second replay same day, awarded again next day
- [x] 2.5 Implement no-hint bonus in the completion persistence flow
- [x] 2.6 Implement first-clear bonus in the completion persistence flow
- [x] 2.7 Implement streak-day bonus in the completion persistence flow
- [x] 2.8 Implement replay-per-day cap on existing replay bonus (add per-level per-day tracking)

## 3. Badge Catalogue (Server)

- [x] 3.1 Write tests for star milestone evaluation: 3-star all 1–50, 51–100, 101–150, and all-levels badges based on progress data
- [x] 3.2 Write tests for colour mastery evaluation: badge awarded when all levels in a colour band are 3-starred
- [x] 3.3 Implement `BadgeCatalogue` with star milestone and colour mastery badge definitions, following the same evaluation pattern as `AchievementCatalogue`
- [x] 3.4 Integrate badge evaluation into the completion flow alongside achievement evaluation (non-blocking)

## 4. Completion Response Extensions (Server)

- [x] 4.1 Write tests for completion response: verify it includes rank-up event, new badges, and itemised bonus XP
- [x] 4.2 Extend completion response to include rank-up event (tier promotion vs sub-level up vs none)
- [x] 4.3 Extend completion response to include newly earned badges alongside newly earned achievements
- [x] 4.4 Extend completion response to itemise each bonus XP source (no-hint, first-clear, streak, replay, time-beat)

## 5. Progress & Stats API Extensions (Server)

- [x] 5.1 Write tests for progress endpoint: verify response includes rank (tier, sub-level), current XP, and next threshold
- [x] 5.2 Extend progress endpoint response to include rank info
- [x] 5.3 Write tests for stats endpoint: verify response includes rank and badge shelf data
- [x] 5.4 Extend stats endpoint to include rank info and earned/locked badge list with progress

## 6. Points → XP Rename (Client)

- [x] 6.1 Update i18n keys and translation strings: rename all "points" labels to "XP" in English and German locales
- [x] 6.2 Update `ProgressTiles` component: rename "Total Points" tile to "XP"
- [x] 6.3 Update solved overlay in `GameScreen`: change "+N pts" to "+N XP", add bonus XP line items
- [x] 6.4 Update `StatsPage`: rename points references to XP
- [x] 6.5 Update leaderboard components: rename points column/label to XP

## 7. Rank Display (Client)

- [x] 7.1 Create rank calculation utility (TypeScript mirror of `RankTier.FromXp`) with unit tests
- [x] 7.2 Create `RankBadge` component: displays tier name + sub-level with tier colour
- [x] 7.3 Create `RankRing` component: renders a coloured ring around the profile ball based on tier
- [x] 7.4 Add rank tile to `ProgressTiles`: tier + sub-level with colour and XP progress bar to next sub-level
- [x] 7.5 Integrate `RankRing` into profile ball rendering wherever it appears (stats page, leaderboard, activity feed)
- [x] 7.6 Add `RankBadge` to leaderboard entries

## 8. Rank-Up Celebration (Client)

- [x] 8.1 Add rank-up display to solved overlay: brief indicator for sub-level up, prominent animation for tier promotion
- [x] 8.2 Ensure rank-up celebration does not block "Next Level" or "Play Again" actions

## 9. Rank Progress on Stats Page (Client)

- [x] 9.1 Replace level-progress bar with rank progress display: tier, sub-level, XP bar to next threshold
- [x] 9.2 Handle Diamond 5 (max rank) case: no progress bar, just the rank label

## 10. Badge Shelf (Client)

- [x] 10.1 Create `BadgeShelf` component: grid of badges grouped by category (star milestones, colour mastery, achievements)
- [x] 10.2 Implement earned vs locked badge styling: full colour for earned, greyed out for locked, progress hint for threshold badges
- [x] 10.3 Add rare badge visual treatment for "3-star all levels" and final colour mastery badge
- [x] 10.4 Integrate `BadgeShelf` into `StatsPage` below stats summary
- [x] 10.5 Wire badge data from stats API response into the `BadgeShelf` component

## 11. Integration & Verification

- [x] 11.1 Run all backend tests (`dotnet test`) and verify all pass
- [x] 11.2 Run all client tests (`npm test`) and verify all pass
- [x] 11.3 Rebuild Docker image and verify XP rename, rank display, rank ring, and badge shelf in the running app
- [x] 11.4 Verify rank-up celebration triggers correctly on the solved screen
- [x] 11.5 Verify leaderboard shows rank badges and rank rings
