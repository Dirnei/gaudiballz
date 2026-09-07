# Tasks — add usernames

## 1. Storing a name

- [x] 1.1 Add the username to the player record, with a normalised lowercase form alongside
      it for comparison
- [x] 1.2 Enforce uniqueness with a unique index on the normalised form, so two registrations
      racing cannot both succeed — a check-then-write would let them. The index has to be
      sparse AND the field omitted when absent: the driver writes an explicit null by
      default, so every anonymous player collided on null until the class map was told to
      leave it out
- [x] 1.3 Write tests against a real MongoDB: a taken name is refused, a differently
      capitalised name is refused, and a free name is accepted

## 2. Endpoints

- [x] 2.1 Add an availability check so a name is validated before the device is asked for a
      passkey
- [x] 2.2 Accept the username when registration begins, and reject a taken one there too —
      availability can change between the check and the finish
- [x] 2.3 Return the username from the identity endpoints, so the client can show it

## 3. The interface

- [x] 3.1 Ask for a username when registering, and report a taken name before the passkey
      step
- [x] 3.2 Rename the controls to log in, register and log out
- [x] 3.3 Show the username in the header when logged in, and say plainly when not
- [x] 3.4 Confirm logging in still needs nothing typed

## 4. Existing accounts

- [x] 4.1 Confirm an account created before usernames keeps working and is not locked out
- [x] 4.2 Ask such an account for a username the next time the panel is opened

## 5. Verification

- [x] 5.1 Run every CI step locally and confirm green
- [x] 5.2 Rebuild the container and confirm the served bundle matches a fresh local build
