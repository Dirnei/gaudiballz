# Tasks — add player accounts

Persistence and identity are the first parts of this project where a mistake loses a
player's work rather than showing them a wrong number, so the tests come first throughout
and the merge rules get property tests rather than examples.

## 1. Persistence foundations

- [x] 1.1 Bring MongoDB out of the `data` profile so it starts with the game, and make the
      server wait on its health check. Index creation moved to a retrying background service
      rather than blocking startup, so a missing database degrades the game instead of
      taking it down — and the Mongo client uses short timeouts so a request fails fast
      instead of hanging on the driver's thirty-second default
- [x] 1.2 Add the Mongo client, explicit BSON class maps rather than auto-mapping, and a
      startup step that creates indexes idempotently
- [x] 1.3 Write integration tests against a real MongoDB via Testcontainers, including that
      index creation is safe to run twice

## 2. Player records

- [x] 2.1 Write tests for creating an anonymous player and reading it back
- [x] 2.2 Implement the player document and repository
- [x] 2.3 Write tests that progress writes use `$min` so a worse attempt cannot overwrite a
      better one, and that repeating a write changes nothing
- [x] 2.4 Implement the progress document keyed by player and level

## 3. Merge rules

- [x] 3.1 Property: merging is commutative — merging A into B gives the same result as B
      into A
- [x] 3.2 Property: merging is idempotent — merging the same progress twice changes nothing
- [x] 3.3 Property: a merge never loses a completed level from either side, and never
      raises a recorded best
- [x] 3.4 Implement the merge

## 4. Session actor

- [x] 4.1 Write TestKit tests: commands for one player are handled one at a time, state
      reloads after a restart, and the actor passivates when idle
- [x] 4.2 Implement the per-player session actor and the registry that routes to it
- [x] 4.3 Write the test that two concurrent completions for one player produce one
      consistent record rather than a lost update

## 5. Anonymous identity

- [x] 5.1 Write tests for the endpoint that mints an anonymous player and returns a token
- [x] 5.2 Implement it, and the token verification the other endpoints depend on
- [x] 5.3 Client: obtain and keep an identity on first launch, with no interaction, and
      confirm a returning browser is the same player

## 6. Passkeys

- [x] 6.1 Add Fido2, configured for discoverable credentials so sign-in needs no username
- [x] 6.2 Write tests for enrolment: the credential attaches to the existing player and the
      progress already made is untouched
- [x] 6.3 Write tests for sign-in: a known credential resolves to its account, an unknown
      one is refused and creates nothing
- [x] 6.4 Implement the enrolment and sign-in endpoints and the credential store
- [x] 6.5 Client: enrolment and sign-in through the browser's WebAuthn API
- [x] 6.6 Detect when passkeys are unavailable — including plain HTTP over the LAN — and say
      so plainly rather than failing obscurely
- [x] 6.7 State before enrolment that losing every device with the passkey loses the account

## 7. Progress in the game

- [x] 7.1 Record a completion with its moves and hints when a level is solved
- [x] 7.2 Load progress on launch and resume where the player was
- [x] 7.3 Merge device progress into the account on sign-in, and confirm neither side is lost
- [x] 7.4 Add the place in the interface to create or use a passkey, reachable at any time
- [x] 7.5 Confirm nothing prompts for an account — no modal, banner, badge, or reminder, and
      nothing at all on level completion

## 8. Offline queue

- [x] 8.1 Write tests that a completion made with no connection is queued, survives a
      restart, and is sent afterwards
- [x] 8.2 Implement the IndexedDB queue with a client-generated id per item so a resend
      cannot double-count
- [x] 8.3 Confirm play is never blocked and no failure is reported for an unsent completion

## 9. Verification

- [x] 9.1 Run every CI step locally and confirm green
- [x] 9.2 Rebuild the container, confirm the served bundle matches a fresh local build, and
      confirm the game still starts with the database present
- [x] 9.3 Confirm the game remains playable when MongoDB is stopped, with completions
      queueing rather than failing — verified against the container: levels still served,
      the client still loads, and a progress call fails in 2s rather than hanging on the
      driver's 30s default
