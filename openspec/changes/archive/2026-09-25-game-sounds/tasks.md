# Tasks

## 1. Sound module

- [x] 1.1 Write tests for `useSoundSetting` (default on, toggle persists to localStorage, blocked storage falls back to on, two subscribers stay in step) and for `play()` being a no-op when muted or when `AudioContext` is missing, and verify they fail
- [x] 1.2 Implement `client/src/sound/sounds.ts` (the six generators from the audition page, the clack rising two semitones per ball) and `useSoundSetting`, and verify the tests pass

## 2. Events

- [x] 2.1 Write `tapSound` tests for what a tap sounds like (`pickup`, silent put-down, silent pour, `invalid`) including "mis-tap that picks up is `pickup`, not `invalid`" and "tap on a finished flask while holding balls is `invalid`", and verify they fail
- [x] 2.2 Implement `tapSound` on top of `resolveTap` and verify those tests and the existing board tests pass
- [x] 2.3 Write `GameBoard` tests with the sound module mocked: pick up, drop with rising level, drop then flask full, solved instead of flask full on the last pour, not allowed on a finished flask and on an illegal drag drop, undo by button and key, no sound on put-down or restart, and nothing while muted. Verify they fail
- [x] 2.4 Wire the sounds into `GameBoard` next to the haptics and verify the tests pass

## 3. Toggle

- [x] 3.1 Add the sound toggle to the control row and the `M` shortcut, with `en`/`de` labels, and verify with a render test (label reflects state, click and `M` toggle, choice persists) and `locale-parity.test.ts`
- [x] 3.2 Write tests for volume in `sounds.ts` (default 0.8, persists, clamps to 0-1, drives the master gain, blocked storage falls back) and verify they fail, then implement and verify they pass
- [x] 3.3 Write `SoundMenu` tests (Sound button opens the menu, switch mutes and unmutes, slider sets and persists the volume and plays a sample on release but not while off, outside tap and Escape close it, Escape doesn't reach the board, `M` still toggles) and verify they fail
- [x] 3.4 Implement `SoundMenu`, open it from the Sound button, add `en`/`de` strings, and verify the tests and `locale-parity.test.ts` pass

## 4. Verify

- [x] 4.1 Run `cd client && npm test && npm run build` and verify both pass
- [x] 4.2 Rebuild with `docker compose up -d --build`, play a level at http://localhost:8123 with sound on, and verify each sound by ear, the rising clack, and that mute sticks after a reload
