## 1. Viewport hook

- [x] 1.1 Add a hook reporting whether the viewport is below the 640px breakpoint, reading the current match on initialisation so the first render is already correct
- [x] 1.2 Subscribe to changes and unsubscribe on unmount, so rotating a device or resizing a window switches presentation
- [x] 1.3 Add a `matchMedia` stub to the vitest setup, which jsdom does not provide

## 2. Leaderboard

- [x] 2.1 Use the hook in `LevelLeaderboard` so the compact presentation applies when the viewport is narrow as well as when the caller asks for it
- [x] 2.2 Leave the completion dialog passing `compact`, since it is narrow at every viewport
- [x] 2.3 Remove the inert `hidden sm:inline-flex` from the rank badge usage, leaving the conditional render as the only thing deciding

## 3. Tests

- [x] 3.1 Assert the leaderboard drops the ball and badge on a narrow viewport without the caller passing anything
- [x] 3.2 Assert it keeps them on a wide viewport
- [x] 3.3 Assert the dialog's forced compact form survives a wide viewport
- [x] 3.4 Confirm the existing compact and full-width tests still pass against an explicit viewport rather than an accidental default

## 4. Verification

- [x] 4.1 Run `cd client && npm test` — all tests pass
- [x] 4.2 Rebuild the Docker image and verify at http://localhost:8123
- [x] 4.3 Open level select at 320px, select a level, and confirm names are no longer truncated and no ball or badge is shown
- [x] 4.4 Confirm the same panel at desktop width still shows ball, badge and three star glyphs
- [x] 4.5 Confirm the completion dialog is still compact at desktop width
