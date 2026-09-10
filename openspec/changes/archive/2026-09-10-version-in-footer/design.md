## Context

The game is built and shipped as a single Docker image. The Dockerfile has a
multi-stage build: Node builds the client, .NET builds the server, and a runtime
image combines them. There is currently no version information baked into either
artefact. See proposal.md for motivation.

Vite supports compile-time defines via `define` in the config or the `VITE_`
environment variable convention. The Dockerfile already uses `ARG` / `ENV` for
other settings.

## Goals / Non-Goals

**Goals:**

- A version string in the client bundle, settable at Docker build time.
- Default to `local-dev` when no version is provided (dev mode, plain `npm run dev`).
- Minimal plumbing — no runtime endpoint, no server involvement.

**Non-Goals:**

- Server-side version endpoint or health check enrichment (can add later).
- Automatic version derivation from git tags at build time (caller passes the
  value; CI decides what that value is).

## Decisions

### Vite `VITE_APP_VERSION` env var

**Choice:** Use a `VITE_APP_VERSION` environment variable consumed via
`import.meta.env.VITE_APP_VERSION`, with a fallback to `'local-dev'` in code.

**Why:** Vite replaces `import.meta.env.VITE_*` at build time with their
literal values — no runtime resolution, no extra config. The `VITE_` prefix is
the documented convention and works with both `define` and `.env` files.

**Alternative considered:** `vite.config.ts` `define` block reading
`process.env.APP_VERSION`. Works but requires touching the config file and
doesn't survive `.env` workflows. The `VITE_` convention is simpler.

### Docker build arg → env var pipeline

**Choice:** Add `ARG APP_VERSION=local-dev` to the client build stage,
then `ENV VITE_APP_VERSION=$APP_VERSION` before `npm run build`.

**Why:** Docker `ARG` is the standard mechanism for build-time values. The
default ensures `docker compose up --build` without extra flags still works.

**Passing at build time:** `docker build --build-arg APP_VERSION=1.2.3 .`
or in CI. `docker-compose.yml` can forward it via `args:` under `build:`.

### Footer placement

**Choice:** Render the version as muted text at the trailing edge of the
existing game-screen footer, after the control buttons. Use the same
style on other screens that have a footer.

**Why:** The footer already has a layout with control buttons. Appending
the version there keeps it discoverable without adding a new UI region.

## Risks / Trade-offs

- **Cache staleness:** The version is baked into the JS bundle. A service-worker
  update will eventually deliver the new bundle, but a stale cache may briefly
  show the old version after a deploy. This is acceptable — `autoUpdate`
  registration already handles it, and the version is informational.
- **No git-derived automation:** The version must be passed explicitly. This is
  intentional — the project does not yet have CI, and hardcoding a derivation
  strategy would be premature.
