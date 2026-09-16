## 1. Extract shared predicate

- [x] 1.1 Move `isComplete` from `GameScreen.tsx` local scope to a shared location importable by both `GameScreen.tsx` and `useGame.ts`
- [x] 1.2 Update `GameScreen.tsx` to import the extracted `isComplete` instead of defining it locally

## 2. Tap source lock

- [x] 2.1 Add test: tapping a finished column with nothing selected does not select it
- [x] 2.2 Add test: tapping a finished column with a source selected attempts a pour to it
- [x] 2.3 Guard `tapTube` in `useGame.ts` — skip selection when `selected === null` and the tapped tube is finished

## 3. Drag source lock

- [x] 3.1 Add test: drag does not initiate from a finished column
- [x] 3.2 Guard `onDragStart` in `GameScreen.tsx` — return early when the tube is finished

## 4. Keyboard activation lock

- [x] 4.1 Add test: keyboard activation on a finished column with nothing selected does not select it
- [x] 4.2 Guard Enter/Space handler in `GameScreen.tsx` — skip selection when the focused tube is finished

## 5. Verify

- [x] 5.1 Run client test suite and confirm all tests pass
- [x] 5.2 Verify undo re-enables selection on a previously finished column (manual or test)
- [x] 5.3 Rebuild Docker image and playtest in browser
