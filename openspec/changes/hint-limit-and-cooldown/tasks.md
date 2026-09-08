## 1. Hint budget in the pure attempt module

- [ ] 1.1 Add hint-budget tests to `attempt.test.ts`: `startLevel` returns 3 hints, `canHint` checks budget, `spendHint` decrements, `restartLevel` restores budget, budget cannot go below 0
- [ ] 1.2 Add `HINTS_PER_ATTEMPT`, `hintsRemaining` to `Attempt`, and `canHint` / `spendHint` functions in `attempt.ts`; `startLevel` and `restartLevel` return full hint budget

## 2. Cooldown timer in useGame

- [ ] 2.1 Add `HINT_COOLDOWN_MS = 30_000` constant and `cooldownEnd` state to `useGame.ts`; set it on level load, on reset, and after each hint use
- [ ] 2.2 Add a `useEffect` that schedules a `setTimeout` for the remaining cooldown duration and clears `cooldownEnd` on expiry
- [ ] 2.3 Gate `useHint` behind both `canHint(attempt)` and `cooldownEnd === null`; wire `spendHint` into the hint callback alongside the existing `setHintsUsed` increment

## 3. Hint button UI

- [ ] 3.1 Pass `remaining={game.hintsRemaining}` to the hint `IconButton` so it shows the badge (same pattern as the undo button)
- [ ] 3.2 Update the hint button's `disabled` prop to combine budget exhausted, cooldown active, stuck, and solved conditions
- [ ] 3.3 Add a radial SVG cooldown sweep overlay to the hint button, driven by `requestAnimationFrame` against the `cooldownEnd` timestamp; snap to correct position on tab re-focus

## 4. Verification

- [ ] 4.1 Run `attempt.test.ts` and confirm all new hint-budget tests pass
- [ ] 4.2 Run the full client test suite (`vitest run`) and confirm no regressions
- [ ] 4.3 Rebuild the Docker image, launch the game at localhost:8123, and verify end-to-end: cooldown timer appears on level load, hint becomes available after 30 s, badge decrements on use, button disables at 0 hints, reset restores budget and restarts cooldown
