## Context

See proposal.md — Why. The current identity system is passkey-only with no email
infrastructure. Authentication lives in `PlayerIdentitySlice` (a single file with
endpoints for anonymous creation, passkey enrolment, and passkey sign-in) backed by
`PuzzleStore` (MongoDB). Challenges are stored in-memory `ConcurrentDictionary`s because
they live for seconds and a restart mid-ceremony costs one retry.

The server has no email capability at all — no SMTP client, no email templates, no
`IEmailSender`. Docker Compose runs only the game container and MongoDB.

## Goals / Non-Goals

**Goals:**

- Email-based one-time codes as a second auth method, for registration, sign-in, and
  account recovery
- SMTP configuration via environment variables in `docker-compose.yml`
- Mailpit in Docker Compose for local development
- Graceful degradation: when SMTP is not configured, the game works exactly as before
  (passkey-only)
- Same codebase structure: email endpoints live alongside passkey endpoints in the
  identity slice

**Non-Goals:**

- Email templates with rich HTML — plain text with the code is sufficient for a puzzle game
- OAuth providers (may come later, separate change)
- Email notifications beyond authentication codes (no "you completed a level" emails)
- Rate limiting beyond a simple per-email cooldown (no IP-based throttling, no CAPTCHA)
- Email change (replacing a linked email) — can be done via remove + re-add

## Decisions

### 1. SMTP library: MailKit

**Choice**: MailKit via NuGet (`MailKit` package).

**Why**: The standard .NET SMTP library. `System.Net.Mail.SmtpClient` is marked obsolete
and recommends MailKit. It handles TLS negotiation, authentication, and connection pooling.

**Alternative considered**: Raw `SmtpClient` — functional but deprecated and missing modern
TLS handling.

### 2. Code store: in-memory ConcurrentDictionary with TTL

**Choice**: Same pattern as WebAuthn challenges. A `ConcurrentDictionary<string, PendingCode>`
keyed by email (lowercased), holding the hashed code, creation time, and attempt count.
Expired entries are cleaned up lazily on access.

**Why**: Codes live for minutes and a restart only costs one retry — the same reasoning
the WebAuthn challenges use. No new infrastructure. No Akka actor needed: there is no
long-lived state, no message ordering concern, and no cross-node coordination. A plain
service with a concurrent dictionary is simpler and testable without an actor system.

**Alternative considered**: MongoDB TTL collection — adds a round trip for something that
lives 10 minutes and is needed once. Akka actor — no benefit over a static dictionary
for short-lived, fire-and-forget state with no event-sourcing need.

### 3. Code format: 6-digit numeric, hashed at rest

**Choice**: `Random.Shared.Next(100_000, 999_999)` formatted as a string. Stored as a
SHA-256 hash so a memory dump does not leak valid codes.

**Why**: 6 digits is standard for email OTP. Hashing prevents a memory-dump attack from
yielding usable codes.

### 4. Endpoint structure: four new routes under `/email/`

All within the existing `/api/v1/players` route group:

- `POST /email/add/begin` — authenticated; sends code to provided email
- `POST /email/add/verify` — authenticated; verifies code, links email
- `POST /email/signin/begin` — unauthenticated; sends code to provided email (if account
  exists, but response is identical either way to avoid enumeration)
- `POST /email/signin/finish` — unauthenticated; verifies code, issues bearer token

**Why**: Follows the same begin/finish pattern as passkey endpoints. Keeps all identity
endpoints in one slice. Email-add requires authentication (bearer token); email-signin
does not (same as passkey signin).

### 5. Email-based registration: reuse email-add flow after anonymous creation

**Choice**: When a player registers via email (passkeys unavailable), the client:
1. Enters username
2. Claims the username via a new endpoint that does not require a passkey ceremony
3. Sends the email-add-begin request
4. Verifies the code via email-add-verify

A new endpoint `POST /email/register` combines username claim + email verification in
one flow: accepts `{ username, email }`, claims the username, sends the code, and
`POST /email/register/verify` accepts `{ code }` to complete both the username claim
and the email link atomically.

**Why**: Avoids orphaned usernames if the player abandons the flow between claiming and
verifying. The two-endpoint register flow mirrors the passkey enrol begin/finish pattern.

### 6. Persistence: Email and EmailKey on PlayerDocument

**Choice**: Add `Email` (nullable string) and `EmailKey` (lowercase, nullable string)
to `PlayerDocument`. Sparse unique index on `EmailKey`, same pattern as `UsernameKey`.

**Why**: Case-insensitive uniqueness via a lowered key is the proven pattern already used
for usernames. Sparse index means anonymous players without email do not conflict.

### 7. Docker: Mailpit for development

**Choice**: Add a `mailpit` service to `docker-compose.yml`. SMTP on port 1025, web UI
on port 8025. The game service gets `Smtp__Host: mailpit`, `Smtp__Port: 1025`, no auth.

**Why**: Mailpit captures all outgoing email locally with a web UI for inspection. No
real email is ever sent during development. Production overrides these with real SMTP
credentials.

### 8. Feature gating: SMTP configuration presence

**Choice**: When `Smtp__Host` is not set, the email sender is not registered and a
`/api/v1/players/email/enabled` endpoint returns `{ enabled: false }`. The client checks
this on load and hides all email UI when disabled.

**Why**: Zero-config degradation. A deployment without SMTP works exactly as before —
no code paths change, no errors, no dead buttons.

### 9. Client UI: secondary path in AccountPanel

**Choice**: The AccountPanel keeps its current layout. When email is enabled:
- The "Log in" screen gains a "Use email instead" link below the passkey button
- The "Register" screen gains the same link when passkeys are blocked
- Clicking it opens an email-entry + code-verification flow within the same panel

The email flow uses the same glass-panel visual treatment and ball preview.

**Why**: Email is secondary, so it sits below the primary action. No separate screen or
modal. The visual continuity makes it feel like part of the same system.

## Risks / Trade-offs

**[Email enumeration]** → The sign-in-begin endpoint returns the same response whether
the email exists or not. A code is only sent when the email is linked, but the response
timing should not vary. The implementation sends the response immediately and sends
the email asynchronously (fire-and-forget) to prevent timing side-channels.

**[Code brute-force]** → 6 digits = 900,000 possibilities. Mitigation: limit verification
attempts per pending code (5 attempts, then the code is invalidated and a new one must
be requested). Combined with the 10-minute TTL, this is sufficient for a puzzle game
with no financial data.

**[SMTP misconfiguration]** → If SMTP settings are wrong, codes silently fail to send.
Mitigation: log a warning on send failure. The player sees "check your email" but gets
nothing — they can retry or fall back to passkey. A health-check endpoint could be added
later but is not in scope.

**[Single server in-memory codes]** → Codes are lost on restart. Acceptable: the same
trade-off the WebAuthn challenges already make. A restart mid-flow costs one retry.
If the deployment grows to multiple instances, the code store would need to move to
MongoDB with a TTL index — not in scope for a single-container deployment.
