## Purpose

Shows the build version of the running game so players and developers can tell which
release is deployed without inspecting infrastructure.

## ADDED Requirements

### Requirement: Version visible in footer

The game SHALL display the current build version in the footer area on every screen
that has a footer. The version text MUST be unobtrusive — styled as secondary or
muted text so it does not compete with game controls.

#### Scenario: Docker build with explicit version

- **WHEN** the game is built with a version identifier (e.g. an image tag)
- **THEN** the footer displays that version string

#### Scenario: Local development without a version

- **WHEN** the game is running in development mode without a build version
- **THEN** the footer displays `local-dev`

### Requirement: Version is a build-time constant

The version string MUST be embedded in the client bundle at build time. The client
SHALL NOT fetch the version from the server at runtime.

#### Scenario: Offline play shows version

- **WHEN** the game is loaded and the network becomes unavailable
- **THEN** the version string remains visible in the footer
