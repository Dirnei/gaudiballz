# Tasks — add sign out

## 1. Forgetting an identity

- [x] 1.1 Write tests that signing out clears the stored token and player id, and that a
      later launch obtains a fresh anonymous identity
- [x] 1.2 Write the test that the queue is emptied by signing out, so nothing carries over
      to the next account on this device
- [x] 1.3 Implement sign out: flush the queue, clear it regardless of whether the flush
      succeeded, then forget the identity

## 2. Saying when it is one-way

- [x] 2.1 Add sign out to the account panel, alongside the existing controls
- [x] 2.2 Show the warning only when no passkey is attached, and confirm an enrolled player
      sees no talk of losing progress
- [x] 2.3 Confirm the player can go ahead either way — the warning informs, it does not block

## 3. Afterwards

- [x] 3.1 Return to a fresh anonymous identity and reset the level and progress shown, so
      play continues with no interaction
- [x] 3.2 Confirm signing back in with the same passkey finds the progress intact

## 4. Verification

- [x] 4.1 Run every CI step locally and confirm green
- [x] 4.2 Rebuild the container, confirm the served bundle matches a fresh local build
