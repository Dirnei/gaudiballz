## 1. MainMenu responsive layout

- [ ] 1.1 Reduce outer padding: change `px-6` to `px-4 sm:px-6` on the menu wrapper
- [ ] 1.2 Scale hero title: change `text-4xl` to `text-3xl sm:text-4xl`
- [ ] 1.3 Stack action buttons vertically on mobile: change the button container from `flex flex-wrap` to `flex flex-col sm:flex-row sm:flex-wrap` and make buttons full-width below `sm`

## 2. ProgressTiles responsive grid

- [ ] 2.1 Change grid breakpoints: `grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-4` so tiles go single-column on the narrowest screens

## 3. StatsRibbon responsive sizing

- [ ] 3.1 Reduce chip text size on mobile: change `text-sm` to `text-xs sm:text-sm` on stat chips

## 4. Verification

- [ ] 4.1 Test at 320px viewport: confirm no horizontal overflow, all elements visible and tappable
- [ ] 4.2 Test at 375px viewport (iPhone SE/mini): confirm layout looks balanced, progress tiles show 2 columns
- [ ] 4.3 Test at 640px+ viewport: confirm desktop layout is visually unchanged
- [ ] 4.4 Run existing MainMenu tests to confirm no regressions
