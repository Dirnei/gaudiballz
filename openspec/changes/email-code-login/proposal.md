## Why

Some players cannot create passkeys — unsupported browsers, insecure contexts on a LAN,
corporate device restrictions — and today that leaves them anonymous forever with no way
to sync progress. Losing every device that holds a passkey also means losing the account
permanently. Adding email-based one-time codes as a second authentication method gives
those players a way in and gives all registered players a recovery route, without
introducing a password.

## What Changes

- A registered player can link an email address to their account, verified via a one-time
  code sent to the address. Email is optional and never required.
- When passkeys are unavailable (blocked browser, insecure context), a player can register
  with a username and email address instead, verified via a one-time code.
- A player with a linked email can sign in by requesting a code sent to that email, as an
  alternative to the passkey flow.
- If all passkeys are lost, the linked email provides a recovery path back into the account.
- The server gains an SMTP integration, configured via environment variables in
  `docker-compose.yml`. A Mailpit container is added for local development.
- Passkey remains the default and primary authentication method. Email code is presented as
  a secondary option, never promoted ahead of passkeys.

## Capabilities

### New Capabilities

_(none — the email-code flows are part of player identity, not a separate capability)_

### Modified Capabilities

- `player-identity`: Adds email-code as a second authentication method alongside passkeys.
  Modifies the passkey-enrolment requirement to make email optional rather than absent,
  adds requirements for email verification, email-based registration, email sign-in, and
  account recovery via email. Updates the passkey-limits requirement to reflect that a
  recovery route now exists when email is linked.

## Impact

- **Server endpoints**: Four new endpoints under `/api/v1/players/email/` for adding and
  verifying an email, and for email sign-in (begin/finish).
- **Persistence**: `PlayerDocument` gains `Email` and `EmailKey` fields; a new sparse
  unique index on `EmailKey`.
- **Dependencies**: MailKit (or equivalent SMTP client library) added to the server project.
- **Infrastructure**: SMTP configuration via `Smtp__*` environment variables; Mailpit
  container in docker-compose for development.
- **Client**: `AccountPanel` gains email-entry and code-verification UI states; a new
  `emailLogin.ts` module handles the API calls; new i18n keys.
- **Design decision reversal**: The product context previously ruled out "an emailed
  temporary password" by decision. This change deliberately reverses that stance — a
  one-time code is not a password, and the tradeoff has shifted now that real players are
  hitting passkey barriers.
