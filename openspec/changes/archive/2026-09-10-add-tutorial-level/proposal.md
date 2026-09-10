## Why

New players land on Level 1 with no instructions beyond the tagline "Sort the colours. Clear the board." The two-tap pour mechanic is not self-evident, especially on mobile where there is no hover affordance. A short guided tutorial removes the cold-start friction without adding a mandatory wall of text.

## What Changes

- Add a hand-crafted tutorial board (2 colours, 3 tubes, capacity 3) that is simpler than any generated level
- Overlay step-by-step prompts that walk the player through tap-to-select and tap-to-pour
- Detect first-time players via a localStorage flag and route them to the tutorial before Level 1
- Provide a skip button so returning players or confident newcomers can bypass it
- After completion (or skip), mark the tutorial as seen and proceed to Level 1
- The tutorial does not appear in Level Select, does not count toward progression or scoring, and is not submitted to the server

## Capabilities

### New Capabilities

- `tutorial`: Guided first-play experience that teaches the core pour mechanic before the player's first real level

### Modified Capabilities

- `main-menu`: The Play button redirects first-time players to the tutorial instead of directly to /play

## Impact

- New files: `tutorial.ts` (board + state machine + localStorage helpers), `TutorialScreen.tsx` (UI component)
- Modified files: `App.tsx` (add /tutorial route), `MainMenu.tsx` (redirect logic on Play)
- No server changes, no API changes, no database changes
- No changes to the rules engine or conformance fixtures
- The tutorial board is hardcoded client-side; it bypasses the level API entirely
