# Tasks

## 1. Motion follows the system setting

- [x] 1.1 Write a test that renders the app's routes and, from a probe component inside them, reads Motion's config and expects `reducedMotion` to be `"user"`, on a normal page and on the play screen. Verify it fails
- [x] 1.2 Put every route under a root route whose element is `<MotionConfig reducedMotion="user">` around an `<Outlet />`, so the app and every test that renders `routes` get it, and verify the test and the existing suite pass

## 2. Cooldown ring

- [x] 2.1 Write a test that `CooldownSweep` renders its ring with the `cooldown-ring` class and a `--cooldown-duration` equal to its duration. Verify it fails
- [x] 2.2 Add the class and custom property in `controls.tsx` and the exemption rule inside the reduced-motion block of `index.css`, and verify the test passes

## 3. No flashing

- [x] 3.1 Write a test that reads `index.css` and requires `animation-iteration-count: 1 !important` next to the 0.01 ms duration in the reduced-motion block. Verify it fails
- [x] 3.2 Add the repeat limit to the blanket rule, and verify the test passes and, in Chromium with reduced motion emulated, no animation repeats and consecutive frames of the main menu, play screen and leaderboard don't change (apart from the cooldown ring)

## 4. Verify

- [x] 4.1 Run `cd client && npm test && npm run build` and verify both pass
- [x] 4.2 Rebuild with `docker compose up -d --build`. With the OS "reduce motion" setting on at http://localhost:8123, verify by hand: no sliding on page change, no flask lift, balls appear in place, the solved card and sound menu don't spring, dragging still follows the pointer, and the hint ring fills steadily over the cooldown. Then turn the setting off without reloading and verify the motion comes back
