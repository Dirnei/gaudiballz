## 1. Undo budget of five

- [x] 1.1 Test: an attempt starts with 5 undos and runs out after the fifth
- [x] 1.2 Raise `UNDOS_PER_ATTEMPT` to 5 in `client/src/game/attempt.ts`

## 2. A reset starts the attempt over

- [x] 2.1 Test: a restart returns a full undo budget
- [x] 2.2 Replace `spendReset` with a `restartLevel` that returns a fresh attempt
- [x] 2.3 Clear `hintsUsed` in the `restart` callback in `useGame.ts`

## 3. Hints are the only count

- [x] 3.1 Drop `undosUsed` and `resetsUsed` from `Attempt` and from what `useGame` exposes
- [x] 3.2 Remove the undo and reset counts from the win overlay in `App.tsx`, leaving hints

## 4. Integration and visual verification

- [x] 4.1 Rebuild the Docker image and playtest: five undos, the badge counting down, and a restart giving all five back
- [x] 4.2 Verify the win screen shows the hint count only, and that it counts the solving attempt
