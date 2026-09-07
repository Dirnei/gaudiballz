## 1. Server-side code generation

- [ ] 1.1 Test: generating a code for the same level id and secret always returns the same code
- [ ] 1.2 Test: codes for different level ids are unique (check at least the first 10,000)
- [ ] 1.3 Test: generated codes are at most 6 characters and contain no ambiguous characters (0, O, 1, I, l)
- [ ] 1.4 Implement the HMAC-based code generator: HMAC-SHA256(secret, level id), truncate, encode into the safe alphabet
- [ ] 1.5 Add a configuration entry for the level-code secret (with a dev fallback for local runs)

## 2. Server-side code validation endpoint

- [ ] 2.1 Test: POST /api/v1/levels/unlock with a valid code returns the correct level id
- [ ] 2.2 Test: POST /api/v1/levels/unlock with an invalid code returns 400
- [ ] 2.3 Test: validation is case-insensitive
- [ ] 2.4 Build the in-memory reverse lookup table (code → level id) at startup for levels 1 to the configured maximum
- [ ] 2.5 Add the POST /api/v1/levels/unlock endpoint: accept `{ code }`, look up in the table, return `{ levelId }` or 400

## 3. Level code in the level response

- [ ] 3.1 Test: GET /api/v1/levels/{id} response includes the level code
- [ ] 3.2 Add the `code` field to the levels endpoint response, computed from the code generator

## 4. Client-side level gating

- [ ] 4.1 Test: goToLevel rejects navigation above the level ceiling
- [ ] 4.2 Test: the ceiling equals max(highestCompleted + 1, localUnlock) and defaults to 1 when no progress exists
- [ ] 4.3 Test: completing a level raises the ceiling by 1
- [ ] 4.4 Add `unlockedLevel` to localStorage and a `levelCeiling` derived value to `useGame`
- [ ] 4.5 Gate `goToLevel` in `useGame.ts` — reject level ids above the ceiling
- [ ] 4.6 Disable the next-level button in `App.tsx` when the player is at the ceiling

## 5. Code display in the UI

- [ ] 5.1 Add the level code from the server response to the `useGame` hook state
- [ ] 5.2 Display the level code as muted text beneath the level number in the header
- [ ] 5.3 Add tap-to-copy behaviour on the level code (copy to clipboard, brief visual feedback)

## 6. Code entry UI

- [ ] 6.1 Add a "Level code" section to `AccountPanel` with a text input and submit button
- [ ] 6.2 On submit, call POST /api/v1/levels/unlock with the entered code
- [ ] 6.3 On success, update `localStorage['puzzle.unlockedLevel']` with the returned level id (max of current and new) and navigate to that level
- [ ] 6.4 On failure, show an inline error message ("Invalid code") and leave state unchanged
- [ ] 6.5 Input accepts any case and trims whitespace before sending

## 7. Integration and visual verification

- [ ] 7.1 Rebuild the Docker image and playtest: verify next-level button is disabled at the ceiling, existing progress sets the correct ceiling, and the level code is visible in the header
- [ ] 7.2 Enter a valid code in the account panel and verify levels are unlocked and navigation works
- [ ] 7.3 Enter an invalid code and verify the error message appears with no state change
- [ ] 7.4 Clear localStorage and verify the ceiling falls back to server-side highestCompleted + 1 (or 1 for a fresh player)
