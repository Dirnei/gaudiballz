## 1. Rank Calculation (Server)

- [ ] 1.1 Write tests for `RankTier.FromXp`: Bronze 1 at 0, sub-level boundaries at 8k increments, Silver entry at 80k, Gold at 480k, Platinum at 1M, Diamond at 1.6M, Diamond 5 cap at 2M+, mid-tier values
- [ ] 1.2 Implement `RankTier.FromXp` pure function with the static threshold table returning tier + sub-level
- [ ] 1.3 Write tests for rank-up detection: compare pre/post XP to detect sub-level up, tier promotion, and no-change cases
- [ ] 1.4 Implement rank-up detection function that compares old and new XP and returns rank-up event (sub-level, tier, or none)

## 2. New XP Bonus Sources (Server)

- [ ] 2.1 Write tests for no-hint bonus: 50 XP when hints=0, no bonus when hints>0
- [ ] 2.2 Write tests for first-clear bonus: 75 XP on first completion of a level, 0 on replay
- [ ] 2.3 Write tests for streak-day bonus: 25 XP when extending/starting a streak, 0 on second completion same UTC day
- [ ] 2.4 Write tests for replay-per-day cap: replay bonus awarded once per level per UTC day, denied on second replay same day, awarded again next day
- [ ] 2.5 Implement no-hint bonus in the completion persistence flow
- [ ] 2.6 Implement first-clear bonus in the completion persistence flow
- [ ] 2.7 Implement streak-day bonus in the completion persistence flow
- [ ] 2.8 Implement replay-per-day cap on existing replay bonus (add per-level per-day tracking)

## 3. Badge Catalogue (Server)

- [ ] 3.1 Write tests for star milestone evaluation: 3-star all 1–50, 51–100, 101–150, and all-levels badges based on progress data
- [ ] 3.2 Write tests for colour mastery evaluation: badge awarded when all levels in a colour band are 3-starred
- [ ] 3.3 Implement `BadgeCatalogue` with star milestone and colour mastery badge definitions, following the same evaluation pattern as `AchievementCatalogue`
- [ ] 3.4 Integrate badge evaluation into the completion flow alongside achievement evaluation (non-blocking)

## 4. Completion Response Extensions (Server)

- [ ] 4.1 Write tests for completion response: verify it includes rank-up event, new badges, and itemised bonus XP
- [ ] 4.2 Extend completion response to include rank-up event (tier promotion vs sub-level up vs none)
- [ ] 4.3 Extend completion response to include newly earned badges alongside newly earned achievements
- [ ] 4.4 Extend completion response to itemise each bonus XP source (no-hint, first-clear, streak, replay, time-beat)

## 5. Progress & Stats API Extensions (Server)

- [ ] 5.1 Write tests for progress endpoint: verify response includes rank (tier, sub-level), current XP, and next threshold
- [ ] 5.2 Extend progress endpoint response to include rank info
- [ ] 5.3 Write tests for stats endpoint: verify response includes rank and badge shelf data
- [ ] 5.4 Extend stats endpoint to include rank info and earned/locked badge list with progress

## 6. Points → XP Rename (Client)

- [ ] 6.1 Update i18n keys and translation strings: rename all "points" labels to "XP" in English and German locales
- [ ] 6.2 Update `ProgressTiles` component: rename "Total Points" tile to "XP"
- [ ] 6.3 Update solved overlay in `GameScreen`: change "+N pts" to "+N XP", add bonus XP line items
- [ ] 6.4 Update `StatsPage`: rename points references to XP
- [ ] 6.5 Update leaderboard components: rename points column/label to XP

## 7. Rank Display (Client)

- [ ] 7.1 Create rank calculation utility (TypeScript mirror of `RankTier.FromXp`) with unit tests
- [ ] 7.2 Create `RankBadge` component: displays tier name + sub-level with tier colour
- [ ] 7.3 Create `RankRing` component: renders a coloured ring around the profile ball based on tier
- [ ] 7.4 Add rank tile to `ProgressTiles`: tier + sub-level with colour and XP progress bar to next sub-level
- [ ] 7.5 Integrate `RankRing` into profile ball rendering wherever it appears (stats page, leaderboard, activity feed)
- [ ] 7.6 Add `RankBadge` to leaderboard entries

## 8. Rank-Up Celebration (Client)

- [ ] 8.1 Add rank-up display to solved overlay: brief indicator for sub-level up, prominent animation for tier promotion
- [ ] 8.2 Ensure rank-up celebration does not block "Next Level" or "Play Again" actions

## 9. Rank Progress on Stats Page (Client)

- [ ] 9.1 Replace level-progress bar with rank progress display: tier, sub-level, XP bar to next threshold
- [ ] 9.2 Handle Diamond 5 (max rank) case: no progress bar, just the rank label

## 10. Badge Shelf (Client)

- [ ] 10.1 Create `BadgeShelf` component: grid of badges grouped by category (star milestones, colour mastery, achievements)
- [ ] 10.2 Implement earned vs locked badge styling: full colour for earned, greyed out for locked, progress hint for threshold badges
- [ ] 10.3 Add rare badge visual treatment for "3-star all levels" and final colour mastery badge
- [ ] 10.4 Integrate `BadgeShelf` into `StatsPage` below stats summary
- [ ] 10.5 Wire badge data from stats API response into the `BadgeShelf` component

## 11. Integration & Verification

- [ ] 11.1 Run all backend tests (`dotnet test`) and verify all pass
- [ ] 11.2 Run all client tests (`npm test`) and verify all pass
- [ ] 11.3 Rebuild Docker image and verify XP rename, rank display, rank ring, and badge shelf in the running app
- [ ] 11.4 Verify rank-up celebration triggers correctly on the solved screen
- [ ] 11.5 Verify leaderboard shows rank badges and rank rings
