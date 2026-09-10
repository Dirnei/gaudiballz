## Purpose

Provides a branded, player-friendly error screen when an unhandled runtime error crashes a route, replacing raw stack traces with a recovery path back to the main menu.

## ADDED Requirements

### Requirement: Error fallback replaces raw errors
When an unhandled error occurs inside any route, the application SHALL display a styled error fallback screen instead of a raw stack trace or blank page.

#### Scenario: Runtime error during gameplay
- **WHEN** an unhandled error occurs while the player is on any route
- **THEN** the error fallback screen is displayed instead of a stack trace

#### Scenario: Runtime error on a menu page
- **WHEN** an unhandled error occurs on a non-gameplay route (e.g. level select, leaderboard)
- **THEN** the error fallback screen is displayed instead of a stack trace

### Requirement: Error screen matches game theme
The error fallback screen SHALL use the same dark visual theme as the rest of the application, including the background gradient, brand typeface, and colour palette.

#### Scenario: Visual consistency
- **WHEN** the error fallback screen is displayed
- **THEN** the background, typography, and colours are consistent with the game's existing screens

### Requirement: Recovery navigation to main menu
The error fallback screen SHALL offer a clearly labelled action that navigates the player back to the main menu.

#### Scenario: Player recovers from error
- **WHEN** the player activates the recovery action on the error screen
- **THEN** the application navigates to the main menu and is usable again without a full page reload

### Requirement: No player data exposed
The error fallback screen MUST NOT display internal error details (stack traces, component names, variable values) to players in production builds.

#### Scenario: Production error details hidden
- **WHEN** an error occurs in a production build
- **THEN** only a friendly message and the recovery action are shown; no technical details are visible

### Requirement: Developer error details in development
In development builds, the error fallback screen SHALL provide access to the error message for debugging purposes.

#### Scenario: Development error details available
- **WHEN** an error occurs in a development build
- **THEN** the error message is accessible on the error screen without leaving the page
