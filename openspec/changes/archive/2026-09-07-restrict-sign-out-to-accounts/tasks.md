# Tasks — restrict sign out to accounts

## 1. The panel

- [x] 1.1 Show sign out only when a passkey is attached
- [x] 1.2 Remove the destructive warning and the branch that chose between the two messages,
      so one path remains rather than two
- [x] 1.3 Confirm an anonymous player sees no sign out at all, not a disabled one

## 2. Verification

- [x] 2.1 Confirm the sign-out behaviour itself is unchanged, including flushing queued
      completions before the identity is forgotten
- [x] 2.2 Run every CI step locally and confirm green
- [x] 2.3 Rebuild the container and confirm the served bundle matches a fresh local build
