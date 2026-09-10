## Why

The Impressum and Datenschutz pages currently render hardcoded placeholder text (`[Ihr Name]`, `[Ihre Adresse]`, etc.). Deploying the game publicly requires filling in real operator details, but baking them into the React bundle means rebuilding the image for every change. Operator contact info should be injectable at deploy time via environment variables so the same image works for any operator.

## What Changes

- Add a server endpoint that returns legal contact details read from configuration (mapped to environment variables)
- Update the Impressum and Datenschutz React components to fetch contact details from the new endpoint and render them dynamically
- Replace the "placeholder fields" requirement with a "configurable contact details" requirement: when no values are configured, the pages show a notice instead of broken-looking brackets
- Add `Legal__*` environment variables to `docker-compose.yml` as commented-out examples

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `legal-pages`: The operator-specific fields are no longer hardcoded placeholders; they are supplied via server configuration at runtime and fetched by the client.

## Impact

- **Server**: New GET endpoint under `/api/legal/contact`, reads from `IConfiguration` (no database, no auth).
- **Client**: `Impressum.tsx` and `Datenschutz.tsx` gain a fetch call on mount; the static placeholder markup is replaced with dynamic rendering.
- **Docker Compose**: New `Legal__*` environment variables on the `game` service.
- **No breaking changes**: The page URLs stay the same, no existing API contracts change.
