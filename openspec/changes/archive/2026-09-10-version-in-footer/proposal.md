## Why

There is no way to tell which version of the game is running. When testing a Docker
build or debugging a report, the first question is "which build is this?" and currently
the only answer is to inspect the image tag from outside the container. A visible
version in the UI makes that instant.

## What Changes

- The game footer shows the application version — the Docker image tag when running
  from a built image, or `local-dev` when running outside Docker (dev mode).
- The version string is baked into the client at build time via Vite's define/env
  mechanism, fed by a Docker build argument.
- The server does not need to serve the version at runtime; it is a compile-time
  constant in the client bundle.

## Capabilities

### New Capabilities

- `version-display`: The game shows its build version in the footer area of every
  screen, sourced from the Docker image tag at build time or defaulting to `local-dev`.

### Modified Capabilities

_(none — no existing spec-level behaviour changes)_

## Impact

- **Dockerfile**: New `ARG` for the version, passed to the Vite build as an env variable.
- **docker-compose.yml**: Optionally passes a build arg; local compose builds default to
  `local-dev`.
- **client/vite.config.ts**: Exposes the build arg as a compile-time define.
- **client/src/game/GameScreen.tsx** (and possibly other screens sharing the footer):
  Renders the version string.
- No API changes, no server changes, no database changes.
