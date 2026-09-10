## 1. Server endpoint

- [x] 1.1 Add `LegalSlice` implementing `ISlice` with a `GET /api/legal/contact` endpoint that returns `{ name, street, city, country, email }` from `IConfiguration["Legal:*"]`, defaulting each to `""`
- [x] 1.2 Register `LegalSlice` in `Program.cs` (AddServices + MapEndpoints)

## 2. Client hook and components

- [x] 2.1 Add a `useLegalContact` hook that fetches `/api/legal/contact` on mount and returns the contact fields plus a loading/configured state
- [x] 2.2 Rewrite `Impressum.tsx` to use `useLegalContact` — render contact details when configured, show a "not configured" notice when all fields are empty
- [x] 2.3 Rewrite `Datenschutz.tsx` to use `useLegalContact` — replace the placeholder spans in the Verantwortlicher section, show a "not configured" notice when empty

## 3. Docker Compose configuration

- [x] 3.1 Add commented-out `Legal__*` environment variables to `docker-compose.yml` on the `game` service

## 4. Verify

- [x] 4.1 Rebuild the Docker image and verify the Impressum and Datenschutz pages render the configured values from env vars
