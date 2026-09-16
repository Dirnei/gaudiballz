## 1. Compact presentation

- [x] 1.1 Add a `compact` prop to `LevelLeaderboard`, defaulting to the current full-width presentation
- [x] 1.2 Omit the profile ball and its rank ring when compact
- [x] 1.3 Omit the rank badge when compact
- [x] 1.4 Render the star rating as a single star with a count when compact, keeping three glyphs at full width
- [x] 1.5 Give the name the width freed by the removed columns, so it truncates only when it genuinely cannot fit
- [x] 1.6 Apply the star-count treatment to the outside-top-10 block when compact

## 2. Wiring

- [x] 2.1 Pass `compact` from the completion dialog in `GameScreen`
- [x] 2.2 Leave both `LevelSelect` usages on the full-width presentation

## 3. Tests

- [x] 3.1 Extend `LevelLeaderboard.test.tsx`: the compact view renders rank, name, star count, moves and time
- [x] 3.2 Assert the compact view renders no profile ball and no rank badge
- [x] 3.3 Assert the full-width view still renders ball, badge and three star glyphs
- [x] 3.4 Assert an entry ranked above another with better moves still shows the higher star count, so the ordering is accountable

## 4. Column alignment

- [x] 4.1 Give the star, move and time columns fixed widths so their boundaries stop shifting row to row
- [x] 4.2 Right-align the numeric columns against those widths, keeping `tabular-nums` so digits occupy equal space
- [x] 4.3 Size the time column for the longest value it can hold, so a level over 100 seconds does not clip
- [x] 4.4 Assert in tests that rows keep a consistent column structure regardless of value widths

## 5. Verification

- [x] 5.1 Run `cd client && npm test` — all tests pass
- [x] 5.2 Rebuild the Docker image and verify at http://localhost:8123
- [x] 5.3 Complete a level, open the leaderboard in the dialog, and confirm the columns line up and nothing overflows at 320px width
- [x] 5.4 Confirm the level-select leaderboard still shows ball, badge and stars unchanged
