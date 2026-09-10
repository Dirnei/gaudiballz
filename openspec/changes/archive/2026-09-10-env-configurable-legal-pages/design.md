## Context

The Impressum and Datenschutz pages exist (see `legal-pages` spec) but use hardcoded placeholder brackets for operator info. The app is deployed as a single Docker image where Kestrel serves both the API and the built SPA. Environment variables already configure Mongo, Passkeys, and other runtime settings via `IConfiguration` section binding in `docker-compose.yml`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Operator contact details configurable at container start via `Legal__*` env vars
- Same Docker image usable by different operators without rebuilding
- Graceful behaviour when no contact details are configured

**Non-Goals:**

- Rich-text or HTML formatting in contact details — plain strings are sufficient
- Per-page customization (separate Impressum vs Datenschutz contacts) — same operator info appears on both
- Admin UI for editing contact details — env vars are the interface

## Decisions

### Server endpoint as a `LegalSlice`

Add a `LegalSlice` following the existing slice pattern (`ISlice` with `AddServices` / `MapEndpoints`). It exposes a single `GET /api/legal/contact` endpoint that reads from the `Legal` configuration section.

No Akka actors — this is a stateless read from `IConfiguration`, not a domain problem that needs lifecycle management. A plain minimal-API handler is the right tool.

**Alternative considered:** Injecting values into the SPA at build time via Vite env vars. Rejected because it bakes values into the JS bundle, requiring an image rebuild for every change.

**Alternative considered:** Templating `index.html` at container startup (e.g. `envsubst`). Rejected because it adds a shell entrypoint and fragile string replacement to a container that currently needs no init script.

### Client fetches on mount

Both `Impressum.tsx` and `Datenschutz.tsx` call the endpoint on mount. The response is small and cacheable. When all fields are empty, the components render a "not configured" notice instead of blank space.

A shared hook (`useLegalContact`) avoids duplicating the fetch logic across both pages.

### Configuration shape

```
Legal__Name=…
Legal__Street=…
Legal__City=…
Legal__Country=…
Legal__Email=…
```

These map to `IConfiguration["Legal:Name"]` etc. via the standard ASP.NET Core env var convention. No `IOptions<T>` wrapper — the five flat reads are not worth a registered type.

## Risks / Trade-offs

- **Extra network request on legal pages:** The contact data is tiny and the endpoint is fast. Output caching can be added later if needed, but is not warranted at current scale.
- **Unconfigured state is visible:** By design — a deployed instance without contact info shows a clear "not configured" notice rather than silently hiding content. This is preferable to rendering empty sections that look broken.
