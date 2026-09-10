## 1. Tutorial Logic (already done)

- [x] 1.1 Create `tutorial.ts` with board definition, state machine, localStorage helpers, and prompt text
- [x] 1.2 Write tests for tutorial board, state machine, and first-time detection in `tutorial.test.ts`

## 2. Tutorial Screen

- [x] 2.1 Create `TutorialScreen.tsx` that renders the tutorial board using `Tube` components, manages its own `GameState`, and displays overlay prompts based on the tutorial step
- [x] 2.2 Add skip button that calls `markTutorialSeen()` and navigates to `/play`
- [x] 2.3 Add completion flow: detect `isSolved`, call `markTutorialSeen()`, show brief success message, then navigate to `/play`
- [x] 2.4 Write tests for `TutorialScreen` covering: prompts render for each step, skip navigates away, completion navigates away

## 3. Routing and Integration

- [x] 3.1 Add `/tutorial` route under `ImmersiveLayout` in `App.tsx`
- [x] 3.2 Modify MainMenu Play button to check `needsTutorial()` and navigate to `/tutorial` when true
- [x] 3.3 Write test in `App.test.tsx` or `MainMenu.test.tsx` verifying first-time redirect to tutorial

## 4. Verification

- [x] 4.1 Run full test suite and confirm no regressions
- [x] 4.2 Build and run in Docker, manually verify tutorial flow on desktop and mobile viewport
