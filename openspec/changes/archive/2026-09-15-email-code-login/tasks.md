## 1. Infrastructure and Configuration

- [x] 1.1 Add Mailpit service to `docker-compose.yml` (SMTP on 1025, web UI on 8025)
- [x] 1.2 Add `Smtp__Host`, `Smtp__Port`, `Smtp__From` environment variables to the game service in `docker-compose.yml`, pointing at Mailpit
- [x] 1.3 Add MailKit NuGet package to `GaudiBallz.Server`

## 2. Email Sending Service

- [x] 2.1 Write tests for the email sender: sends via SMTP when configured, is not registered when config is absent
- [x] 2.2 Create `IEmailSender` interface with `SendCodeAsync(string email, string code)`
- [x] 2.3 Implement `SmtpEmailSender` using MailKit, configured from `Smtp__*` settings
- [x] 2.4 Register `IEmailSender` in DI conditionally — only when `Smtp__Host` is set

## 3. One-Time Code Store

- [x] 3.1 Write tests for the code store: generation, hashing, TTL expiry, single-use, attempt limiting, cooldown throttling
- [x] 3.2 Implement `EmailCodeStore` — in-memory `ConcurrentDictionary` with 6-digit codes, SHA-256 hashing, 10-minute TTL, 5-attempt limit, 60-second per-email cooldown

## 4. Persistence

- [x] 4.1 Add `Email` and `EmailKey` fields to `PlayerDocument`
- [x] 4.2 Add sparse unique index on `EmailKey` in `PuzzleStore.EnsureIndexes`
- [x] 4.3 Add `LinkEmailAsync`, `RemoveEmailAsync`, `FindByEmailAsync` methods to `PuzzleStore`

## 5. Email-Add Endpoints (link email to existing account)

- [x] 5.1 Write integration tests: begin sends code, verify links email, duplicate email refused, case-insensitive uniqueness, remove email
- [x] 5.2 Implement `POST /email/add/begin` — authenticated, validates email format, checks uniqueness, sends code
- [x] 5.3 Implement `POST /email/add/verify` — authenticated, verifies code, calls `LinkEmailAsync`
- [x] 5.4 Implement `POST /email/remove` — authenticated, removes email from account
- [x] 5.5 Add `GET /email/enabled` endpoint — returns `{ enabled: true/false }` based on whether `IEmailSender` is registered

## 6. Email Sign-In Endpoints

- [x] 6.1 Write integration tests: begin accepts any email without revealing existence, finish issues token for valid code, expired and reused codes refused, attempt limit enforced
- [x] 6.2 Implement `POST /email/signin/begin` — unauthenticated, always returns success, sends code only if email exists (anti-enumeration)
- [x] 6.3 Implement `POST /email/signin/finish` — unauthenticated, verifies code, issues bearer token via `PlayerTokens`

## 7. Email Registration Endpoints

- [x] 7.1 Write integration tests: register claims username + sends code, verify completes registration atomically, username rolled back if abandoned, taken username refused before code
- [x] 7.2 Implement `POST /email/register` — unauthenticated (uses anonymous bearer), accepts `{ username, email }`, claims username, sends code
- [x] 7.3 Implement `POST /email/register/verify` — verifies code, marks player as enrolled with email, preserves anonymous progress

## 8. Include Email in Player Profile

- [x] 8.1 Update `GET /me` response to include `email` field (null when none linked) and `emailEnabled` (whether SMTP is configured)
- [x] 8.2 Update client `Identity` type to include `email` and `emailEnabled`

## 9. Client: Email Login Module

- [x] 9.1 Create `emailLogin.ts` with API functions: `checkEmailEnabled`, `addEmailBegin`, `addEmailVerify`, `removeEmail`, `emailSignInBegin`, `emailSignInFinish`, `emailRegisterBegin`, `emailRegisterVerify`
- [x] 9.2 Write tests for `emailLogin.ts` API functions

## 10. Client: AccountPanel Email UI

- [x] 10.1 Add i18n keys for email flows: enter email, enter code, use email instead, code sent, code expired, email linked, email removed, throttled
- [x] 10.2 Add "Use email instead" link on the log-in screen (shown only when email is enabled)
- [x] 10.3 Add email sign-in flow: email entry → code entry → signed in
- [x] 10.4 Add email registration flow: username + email entry → code entry → registered (shown when passkeys are blocked and email is enabled)
- [x] 10.5 Update passkey-blocked message to offer email registration when available
- [x] 10.6 Add "Add email" option in logged-in account controls: email entry → code verification → linked
- [x] 10.7 Add "Remove email" option when email is linked
- [x] 10.8 Update passkey-limits warning to mention email recovery when an email is linked

## 11. End-to-End Verification

- [x] 11.1 Rebuild Docker image and verify at http://localhost:8123 — passkey flow unchanged
- [x] 11.2 Verify Mailpit receives codes at http://localhost:8035
- [x] 11.3 Test full email registration flow (with passkey simulated as blocked)
- [x] 11.4 Test full email sign-in flow on a second browser/incognito
- [x] 11.5 Test graceful degradation: remove SMTP config, confirm no email UI appears
